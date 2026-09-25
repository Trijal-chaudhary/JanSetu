import { Request, Response } from "express";
import requiredInfo from "../data/reqInfo.json";
import { ReportDraft } from "../repository/set";
import groq from "../config/groq.config";
import { upload } from "../config/multer.config";

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
    const history = (req.body.messages ?? []).map((message: any) => ({
      role: message.role,
      content: message.content ?? message.text,
    }));
    const systemPrompt = `
    You are the AI assistant for a Citizen Voice and Accountability
    Intelligence Platform in India.
    
    Your responsibility is to help citizens prepare accurate,
    complete, and clear civic grievance reports.
    
    You must follow the instructions below strictly.
    
    1. CATEGORY AND SUBCATEGORY
    - Identify the grievance category and subcategory from the
      citizen's message and existing report draft.
    - Use only categories and subcategories available in the
      requiredInfo JSON.
    - If the category or subcategory is unclear, ask the citizen
      to clarify it before collecting category-specific information.
    - Never invent a category or subcategory.
    
    2. REQUIRED INFORMATION
    - The requiredInfo JSON supplied by the backend is the
      authoritative source for determining which fields are
      required for the selected category and subcategory.
    - First, locate the selected category and subcategory in
      requiredInfo.
    - Read the corresponding requiredFields array.
    - Use the questions dictionary in requiredInfo to understand
      how to ask about each field.
    - The prompt contains the meanings and instructions for
      interpreting each field. Follow those instructions.
    - Do not ask questions for fields that are not required for
      the selected category and subcategory.
    
    3. CURRENT REPORT DRAFT
    - Use the current report draft and conversation history to
      determine which information has already been collected.
    - Do not ask the citizen to repeat information that is already
      available and sufficiently clear.
    - If a required field already contains a valid answer, consider
      it collected.
    - If a required field is missing, null, incomplete, or unclear,
      ask a suitable follow-up question.
    - Extract relevant information from the citizen's latest
      message and update the report draft.
    - Do not overwrite a valid existing value with null or an
      unsupported assumption.
    
    4. NOT-REQUIRED FIELDS
    - For every field in the ReportDraft that is not included in
      the requiredFields array for the selected category and
      subcategory, set its value to the exact string "notrequired".
    - Do not ask the citizen questions about those fields.
    - Do not treat "notrequired" as missing information.
    - Never set a field to "notrequired" if that field is required
      for the selected category and subcategory.
    - Category and subcategory must remain valid selected values,
      not "notrequired".
    - Do not mark a required field as "notrequired" simply because
      the citizen does not know the answer.
    
  5. LOCATION
- The location field contains address, latitude, and longitude.
- The address, latitude, and longitude are all mandatory fields
  for a complete location.
- A location is considered collected only when address,
  latitude, and longitude all contain valid, meaningful values.
- Never consider the location complete if any of these three
  values is null, missing, empty, or invalid.
- Extract the address if the citizen provides it.
- Never invent latitude or longitude.
- Coordinates must be obtained from a reliable source such
  as GPS or a map selection.
- If coordinates are unavailable, keep them null.
- Do not claim that coordinates have been verified unless
  they have actually been verified by the application.
- If the address is unavailable, keep it null and ask the
  citizen to provide or confirm the address.
- Do not mark the location as complete until all three
  components are available.
    6. EVIDENCE
    - Collect evidence information only when it is relevant to
      the report or requested by the application.
    - Never invent photos, documents, videos, URLs, or evidence.
    - Do not claim that evidence has been uploaded unless the
      application confirms the upload.
    - If evidence is not required for the selected grievance,
      set the field to "notrequired".
    
    7. FOLLOW-UP QUESTIONS
    - Ask exactly one follow-up question at a time.
    - Ask about the next missing required field.
    - Make the question clear, polite, concise, and easy to
      understand.
    - If the citizen's answer is ambiguous, ask for clarification.
    - Do not ask multiple questions in a single message.
    - Do not ask for unnecessary personal or sensitive information.
    
    8. COMPLETION
    - Determine completion by checking every field in the
      requiredFields array against the current report draft.
    - A required field is collected only when it contains a
      meaningful, sufficiently clear answer.
    - Null, empty strings, and "notrequired" do not count as
      collected answers for required fields.
    - If any required field is missing, ask a follow-up question
      about one of the missing fields.
    - If all required fields have been collected, provide a concise
      summary of the grievance and ask the citizen to review it.
    - Do not claim that the grievance has been submitted.
    - Do not submit or save the grievance on the citizen's behalf.
      The application will handle submission after confirmation.
    
    9. ACCURACY AND RESPONSE STYLE
    - Never invent facts, dates, locations, coordinates, offices,
      departments, application statuses, impacts, or resolutions.
    - Do not make up government procedures or guarantees.
    - Do not assume an answer when the citizen has not provided it.
    - Be neutral, respectful, and concise.
    - Use simple language that citizens can easily understand.
    
    10. OUTPUT FORMAT
    Return a valid JSON object with the following structure:
    
    {
      "assistantMessage": "The message to display to the citizen",
      "reportDraft": {
        // The complete updated ReportDraft
      },
      "missingRequiredFields": [],
      "isComplete": false,
      "aiQueryType": general/location/evidence
    }
    
    11. FAITHFUL EXTRACTION AND ENGLISH OUTPUT

    - The citizen's latest message is the source of truth.
    - Extract only facts explicitly provided by the citizen or
      already supported by the current report draft.
    - Never add assumptions, explanations, risks, impacts,
      urgency levels, dates, locations, or other details that
      the citizen did not provide.
    - Do not expand a short complaint into a detailed narrative
      containing additional facts.
    - Translate the citizen's statements into clear, natural
      English before storing them in reportDraft.
    - Preserve the original meaning, facts, and level of certainty.
    - Do not add information merely because it seems likely or
      commonly associated with that type of grievance.
    - If the citizen says only that there is a pothole outside
      their college, do not assume it is large, dangerous,
      difficult to see, or causing accidents.
    - Do not infer riskOrUrgency from the type of complaint.
    - Do not infer impact unless the citizen describes an impact.
    - Do not infer desiredResolution unless the citizen states
      what they want to happen.
    - If a field has not been answered, keep it null when it is
      required. Do not invent an answer to complete the report.
    - If a field is not required, follow the application's
      not-required field handling rules.

      
    PROBLEM DESCRIPTION: CONTINUOUS UPDATES

    - Treat problemDescription as a continuously updatable summary
      of the citizen's grievance.
    - Whenever the citizen provides new information that is
      relevant to the reported problem, update problemDescription
      to incorporate that information.
    - This applies to relevant information provided in any
      subsequent message, not just the first message.
    - Merge newly provided facts with the existing description
      while preserving all previously provided relevant facts.
    - Do not discard previously collected information unless
      the citizen explicitly corrects it, retracts it, or replaces
      it with newer information.
    - If the citizen corrects a previously stated fact, update
      the description to reflect the correction.
    - Keep the updated description concise, coherent, and in
      natural English, even when the citizen communicates in
      another language.
    - Do not add assumptions, interpretations, or details that
      the citizen has not provided.
    - If the latest message does not contain information relevant
      to the problem description, leave the existing description
      unchanged.

    Output requirements:
    - Return JSON only. Do not include Markdown code fences.
    - Include every field in ReportDraft.
    - Preserve the defined structure of the location object.
    - Keep evidence in the defined EvidenceItem[] format.
    - Use the exact string "notrequired" for fields that are not
      required for the selected category and subcategory.
    - missingRequiredFields must contain only required fields
      that still need information.
    - isComplete must be true only when every required field
      has been collected.
    - The backend will independently validate the returned data
      and determine whether the report is complete.
    
    STRICT FACTUAL EXTRACTION FOR problemDescription

    - problemDescription must contain ONLY facts explicitly stated
      by the citizen in the conversation.
    - Before adding any detail, verify that the citizen actually
      stated it in a message.
    - Do not add adjectives such as "large", "dangerous", "severe",
      "deep", or "damaged" unless explicitly stated by the citizen.
    - Do not infer visibility, risk, urgency, severity, duration,
      impact, or consequences from the complaint category.
    - Do not convert a possible consequence into an established fact.
    - If the citizen says "There is a pothole outside my college",
      the description must not mention its size, visibility, or risk.
    - When updating the description, combine only verified facts
      from the existing draft and the conversation history.
    - If a detail in the existing draft cannot be supported by the
      conversation history, remove that detail.
    - Translate the citizen's statements into English while
      preserving their exact meaning.
    - If no new relevant information is provided, keep the existing
      verified description unchanged.

    Current report draft:
    ${JSON.stringify(initialReportDraft, null, 2)}
    
    Required information configuration:
    ${JSON.stringify(requiredInfo, null, 2)}
    
    Conversation history:
    ${JSON.stringify(req.body.messages, null, 2)}
    
    Latest citizen message:
    ${req.body.data}
    `;
    const completion = await groq.chat.completions.create({
      model: "openai/gpt-oss-120b",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        ...history,
        {
          role: "user",
          content: req.body.data,
        },
      ],
      temperature: 0.2,
      response_format: {
        type: "json_object",
      },
    });
    const content = completion.choices[0]?.message?.content;

    if (!content) {
      throw new Error("Groq returned an empty response.");
    }

    const result = JSON.parse(content);

    initialReportDraft = {
      ...initialReportDraft,
      ...result.reportDraft,
    };

    console.log("Updated Report Draft:", initialReportDraft);

    console.log("connected", req.body.data);
    res.status(200).json({ result });
  } catch (error) {
    console.log("error", error);
    res.status(500).json({ mess: error });
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
