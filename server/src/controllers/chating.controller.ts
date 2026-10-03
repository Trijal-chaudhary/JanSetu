import { Request, Response } from "express";
import requiredInfo from "../data/reqInfo.json";
import { ReportDraft } from "../repository/set";
import groq from "../config/groq.config";
import { upload } from "../config/multer.config";
import reportDetails from "../model/report";

let initialReportDraft: ReportDraft = {
  category: null,
  subcategory: null,

  problemDescription: null,
  location: {
    address: null,
    latitude: null,
    longitude: null,
  },

  issueType: null,
  serviceOrScheme: null,

  relevantDateOrDuration: null,
  applicationStatus: null,

  evidence: null,

  riskOrUrgency: null,
  impact: null,
  desiredResolution: null,
};

export const collectingInfo = async (req: Request, res: Response) => {
  try {
    /*
    |--------------------------------------------------------------------------
    | 1. GET LATEST CITIZEN MESSAGE
    |--------------------------------------------------------------------------
    */

    const latestCitizenMessage =
      typeof req.body.data === "string" ? req.body.data.trim() : "";

    if (!latestCitizenMessage) {
      return res.status(400).json({
        success: false,
        message: "Citizen message is required.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | 2. GET CURRENT CATEGORY + SUBCATEGORY
    |--------------------------------------------------------------------------
    */

    const currentCategory = initialReportDraft.category;

    const currentSubcategory = initialReportDraft.subcategory;

    /*
    |--------------------------------------------------------------------------
    | 3. GET ONLY RELEVANT REQUIRED FIELDS
    |--------------------------------------------------------------------------
    |
    | We do NOT send the complete reqInfo.json to Groq.
    |
    | If category + subcategory are already known,
    | get only their requiredFields.
    |--------------------------------------------------------------------------
    */

    let requiredFields: string[] = [];

    if (currentCategory && currentSubcategory) {
      requiredFields =
        (requiredInfo as any).categories?.[currentCategory]?.subcategories?.[
          currentSubcategory
        ]?.requiredFields ?? [];
    }

    /*
    |--------------------------------------------------------------------------
    | 4. IF CATEGORY/SUBCATEGORY ARE NOT KNOWN
    |--------------------------------------------------------------------------
    |
    | Only send category + subcategory names.
    | Don't send the complete requiredInfo JSON.
    |--------------------------------------------------------------------------
    */

    let categoryOptions: any = null;

    if (!currentCategory || !currentSubcategory) {
      categoryOptions = Object.entries((requiredInfo as any).categories).map(
        ([category, data]: any) => ({
          category,
          subcategories: Object.keys(data.subcategories),
        })
      );
    }

    /*
    |--------------------------------------------------------------------------
    | 5. SMALL SYSTEM PROMPT
    |--------------------------------------------------------------------------
    */

    const systemPrompt = `
You are the AI assistant for a Citizen Voice and Accountability
Intelligence Platform in India.

Your job is to collect information from the citizen and maintain
the grievance report.

IMPORTANT RULES:

1. Ask exactly ONE follow-up question at a time.

2. Extract only facts explicitly provided by the citizen.
Never invent information.

3. Use the current report draft to know what information has
already been collected.

4. Do not ask for information that is already available.

5. Only ask about fields listed in requiredFields.

6. reportDraft values must be written in clear English.

7. assistantMessage must use the same language/style as the
latest citizen message.

8. If the latest citizen message is Hindi, respond in Hindi.

9. If the latest citizen message is English, respond in English.

10. If the latest citizen message is Hinglish/mixed, respond
naturally in Hinglish/mixed style.

11. Never invent latitude or longitude.

12. Location is complete only when address, latitude and longitude
are all available.

13. Never invent evidence.

14. Do not infer risk, urgency, impact, duration, severity,
application status, or desired resolution.

15. problemDescription must contain only facts provided by
the citizen. If new relevant facts are provided, update it.

16. If multiple pieces of information are provided in one message,
extract all of them, but ask only ONE next question.

17. If all required information is collected, provide a concise
summary and ask the citizen to review it.

18. Do not claim that the grievance has been submitted.

ASSISTANT MESSAGE LANGUAGE RULE
- Only assistantMessage should follow the language of the latest citizen message.
- If the citizen asks in Hindi, generate assistantMessage in Hindi using Devanagari script only.
- If the citizen asks in Hinglish, understand the meaning but generate assistantMessage in Hindi using Devanagari script only.
- If the citizen asks in English, generate assistantMessage in English.
- All other output fields (reportDraft, missingRequiredFields, aiQueryType, isComplete, etc.) must always remain in English.
- Do not translate field names or JSON keys.

AI QUERY TYPE:

Use "location" when asking for:
- address
- locality
- road/street
- landmark
- map location
- GPS
- latitude/longitude
- location confirmation

Use "evidence" when asking for:
- photo
- video
- document
- screenshot
- supporting evidence

Use "general" for all other questions.

Return ONLY valid JSON:

{
  "assistantMessage": "",
  "reportDraft": {},
  "missingRequiredFields": [],
  "isComplete": false,
  "aiQueryType": "general"
}
`;

    /*
    |--------------------------------------------------------------------------
    | 6. BUILD SMALL CONTEXT FOR GROQ
    |--------------------------------------------------------------------------
    |
    | We send:
    |
    | - current draft
    | - relevant required fields
    | - category options ONLY when necessary
    | - latest citizen message
    |
    | We DO NOT send:
    |
    | - complete reqInfo.json
    | - complete conversation history
    |--------------------------------------------------------------------------
    */

    const contextForAI: any = {
      currentReportDraft: initialReportDraft,

      requiredFields,

      latestCitizenMessage,
    };

    if (categoryOptions) {
      contextForAI.categoryOptions = categoryOptions;
    }

    /*
    |--------------------------------------------------------------------------
    | 7. CALL GROQ
    |--------------------------------------------------------------------------
    */

    const completion = await groq.chat.completions.create({
      model: "openai/gpt-oss-120b",

      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: JSON.stringify(contextForAI),
        },
      ],

      temperature: 0.2,

      max_completion_tokens: 1000,

      response_format: {
        type: "json_object",
      },
    });

    /*
    |--------------------------------------------------------------------------
    | 8. GET AI RESPONSE
    |--------------------------------------------------------------------------
    */

    const content = completion.choices[0]?.message?.content;

    if (!content) {
      throw new Error("Groq returned an empty response.");
    }

    const result = JSON.parse(content);

    /*
    |--------------------------------------------------------------------------
    | 9. MERGE AI REPORT DRAFT INTO SERVER DRAFT
    |--------------------------------------------------------------------------
    |
    | This is the important part:
    |
    | Frontend DOES NOT send reportDraft.
    |
    | Backend already has initialReportDraft.
    |
    |--------------------------------------------------------------------------
    */

    initialReportDraft = {
      ...initialReportDraft,
      ...result.reportDraft,
    };

    /*
    |--------------------------------------------------------------------------
    | 10. LOCATION MERGE
    |--------------------------------------------------------------------------
    |
    | Prevent null values returned by AI from accidentally
    | destroying existing location information.
    |--------------------------------------------------------------------------
    */

    if (result.reportDraft?.location) {
      initialReportDraft.location = {
        address:
          result.reportDraft.location.address ??
          initialReportDraft.location?.address ??
          null,

        latitude:
          result.reportDraft.location.latitude ??
          initialReportDraft.location?.latitude ??
          null,

        longitude:
          result.reportDraft.location.longitude ??
          initialReportDraft.location?.longitude ??
          null,
      };
    }

    /*
    |--------------------------------------------------------------------------
    | 11. GET FINAL CATEGORY/SUBCATEGORY
    |--------------------------------------------------------------------------
    */

    const finalCategory = initialReportDraft.category;

    const finalSubcategory = initialReportDraft.subcategory;

    /*
    |--------------------------------------------------------------------------
    | 12. GET FINAL REQUIRED FIELDS FROM BACKEND
    |--------------------------------------------------------------------------
    */

    let finalRequiredFields: string[] = [];

    if (finalCategory && finalSubcategory) {
      finalRequiredFields =
        (requiredInfo as any).categories?.[finalCategory]?.subcategories?.[
          finalSubcategory
        ]?.requiredFields ?? [];
    }

    /*
    |--------------------------------------------------------------------------
    | 13. SET NOT REQUIRED FIELDS,
    |--------------------------------------------------------------------------
    |
    | Backend knows which fields are not required.
    | No need to make the AI do this.
    |--------------------------------------------------------------------------
    */

    const allFields = [
      "problemDescription",
      "location",
      "issueType",
      "serviceOrScheme",
      "relevantDateOrDuration",
      "applicationStatus",
      "evidence",
      "riskOrUrgency",
      "impact",
      "desiredResolution",
    ];

    for (const field of allFields) {
      if (!finalRequiredFields.includes(field)) {
        (initialReportDraft as any)[field] = "notrequired";
      }
    }

    /*
    |--------------------------------------------------------------------------
    | 14. CHECK FIELD COMPLETION
    |--------------------------------------------------------------------------
    */

    const isFieldComplete = (field: string): boolean => {
      /*
      | LOCATION
      */

      if (field === "location") {
        const location = initialReportDraft.location;

        return (
          typeof location?.address === "string" &&
          location.address.trim() !== "" &&
          typeof location?.latitude === "number" &&
          Number.isFinite(location.latitude) &&
          typeof location?.longitude === "number" &&
          Number.isFinite(location.longitude)
        );
      }

      /*
      | EVIDENCE
      */

      if (field === "evidence") {
        return (
          Array.isArray(initialReportDraft.evidence) &&
          initialReportDraft.evidence.length > 0
        );
      }

      /*
      | NORMAL FIELD
      */

      const value = (initialReportDraft as any)[field];

      if (value === null || value === undefined) {
        return false;
      }

      if (typeof value === "string") {
        return value.trim() !== "" && value !== "notrequired";
      }

      return true;
    };

    /*
    |--------------------------------------------------------------------------
    | 15. CALCULATE MISSING FIELDS
    |--------------------------------------------------------------------------
    */

    const missingRequiredFields = finalRequiredFields.filter(
      (field) => !isFieldComplete(field)
    );

    /*
    |--------------------------------------------------------------------------
    | 16. CALCULATE COMPLETION
    |--------------------------------------------------------------------------
    */

    const isComplete =
      finalRequiredFields.length > 0 && missingRequiredFields.length === 0;

    /*
    |--------------------------------------------------------------------------
    | 17. VALIDATE AI QUERY TYPE
    |--------------------------------------------------------------------------
    */

    let aiQueryType = result.aiQueryType;

    if (
      aiQueryType !== "location" &&
      aiQueryType !== "evidence" &&
      aiQueryType !== "general"
    ) {
      aiQueryType = "general";
    }

    /*
    |--------------------------------------------------------------------------
    | 18. FINAL RESULT
    |--------------------------------------------------------------------------
    */

    const finalResult = {
      assistantMessage: result.assistantMessage ?? "",

      reportDraft: initialReportDraft,

      missingRequiredFields,

      isComplete,

      aiQueryType,
    };

    /*
    |--------------------------------------------------------------------------
    | 19. RESPONSE
    |--------------------------------------------------------------------------
    */

    console.log("Updated Report Draft:", initialReportDraft);

    console.log("Required Fields:", finalRequiredFields);

    console.log("Missing Fields:", missingRequiredFields);

    return res.status(200).json({
      success: true,
      result: finalResult,
    });
  } catch (error: any) {
    console.error("collectingInfo error:", error);

    return res.status(500).json({
      success: false,
      message:
        error?.message ?? "Something went wrong while collecting information.",
    });
  }
};

export const uploadingEvedince = (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No files were uploaded",
      });
    }

    const evidence = files.map((file) => {
      let type: "image" | "video" | "document" | "other" = "other";

      if (file.mimetype.startsWith("image/")) {
        type = "image";
      } else if (file.mimetype.startsWith("video/")) {
        type = "video";
      } else if (
        file.mimetype === "application/pdf" ||
        file.mimetype === "application/msword" ||
        file.mimetype ===
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ) {
        type = "document";
      }

      return {
        url: `${req.protocol}://${req.get("host")}/uploads/${file.filename}`,
        type,
      };
    });

    return res.status(200).json({
      success: true,
      evidence,
    });
  } catch (error) {
    console.error("Evidence upload error:", error);

    return res.status(500).json({
      success: false,
      message: "Evidence upload failed",
    });
  }
};

export const reportManual = async (req: Request, res: Response) => {
  try {
    // console.log(req.body);
    const form = req.body.data;
    // const reportdetails = reportDetails
    const report = new reportDetails(form);

    await report.save();
    console.log(form);
    res.status(200).json({ success: true, message: "connected" });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Evidence upload failed",
    });
  }
};

export const getReports = async (req: Request, res: Response) => {
  try {
    const reports = await reportDetails.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      reports,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch reports",
    });
  }
};
