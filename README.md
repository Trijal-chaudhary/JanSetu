# JanSetu

## Indic Citizen Voice & Accountability Intelligence Platform

JanSetu is an AI-assisted citizen grievance and accountability platform designed to bridge the communication gap between citizens and government authorities.

The platform enables citizens to report grievances through manual forms or AI-assisted text and voice interactions. The system helps citizens provide the required information, structures their grievances, classifies and categorizes them, identifies the appropriate authority, and supports grievance tracking and monitoring.

For non-sensitive grievances, JanSetu also provides a community layer where citizens can discover related grievances, upvote existing issues, comment, and confirm that they have experienced the same problem. Semantic clustering is used to connect related grievances and help authorities understand recurring or widespread issues.

Sensitive grievances are handled through restricted access and are not exposed through the public community layer.

---

## 🎯 Objectives

JanSetu is designed around four major objectives:

### 1. Simplify Grievance Reporting

Provide both manual and AI-assisted reporting modes that allow citizens to submit grievances through:

- Manual forms
- Text
- Voice

In AI-assisted mode, the system understands the citizen's description, asks follow-up questions when required, collects relevant information, and generates a structured grievance.

### 2. Ensure Appropriate Grievance Handling

The system classifies grievances as:

- Sensitive
- Non-sensitive

Sensitive grievances are handled through restricted access, while non-sensitive grievances can be made available for community interaction and support.

### 3. Connect Related Grievances

JanSetu uses semantic clustering to identify similar grievances, particularly those reported from the same area.

Citizens experiencing the same issue can be connected to an existing grievance, helping authorities understand the number of affected citizens and the broader impact of an issue.

### 4. Improve Government Accountability and Decision-Making

The platform routes grievances to appropriate government departments or authorities and provides information that can support:

- Case prioritization
- Investigation
- Progress monitoring
- Identification of recurring issues
- Identification of widespread problems
- Grievance resolution

---

# 🏗️ Proposed System Architecture

The JanSetu workflow consists of four major stages:

```text
                         ┌─────────────────────┐
                         │       CITIZEN       │
                         └──────────┬──────────┘
                                    │
                     ┌──────────────┴──────────────┐
                     │                             │
              Manual Reporting              AI-Assisted Reporting
                                                   │
                                            Text / Voice Input
                                                   │
                                                   ▼
                                      ┌────────────────────────┐
                                      │     AI ASSISTANT       │
                                      │                        │
                                      │ Understand Input       │
                                      │ Ask Follow-up Questions│
                                      │ Collect Information    │
                                      │ Structure Grievance   │
                                      └────────────┬───────────┘
                                                   │
                     ┌─────────────────────────────┘
                     │
                     ▼
          ┌────────────────────────────┐
          │       GRIEVANCE            │
          │       PROCESSING            │
          └─────────────┬──────────────┘
                        │
                        ▼
          ┌────────────────────────────┐
          │ SENSITIVITY CLASSIFICATION │
          │                            │
          │ Sensitive / Non-Sensitive  │
          └─────────────┬──────────────┘
                        │
                        ▼
          ┌────────────────────────────┐
          │       CATEGORIZATION       │
          │                            │
          │ Domain / Subdomain         │
          └─────────────┬──────────────┘
                        │
                        ▼
          ┌────────────────────────────┐
          │        AUTHORITY           │
          │          ROUTING            │
          └─────────────┬──────────────┘
                        │
              ┌─────────┴─────────┐
              │                   │
              ▼                   ▼
     Non-Sensitive            Sensitive
              │                   │
              ▼                   ▼
   ┌──────────────────┐   ┌──────────────────┐
   │    SEMANTIC      │   │    RESTRICTED    │
   │    CLUSTERING    │   │     HANDLING     │
   │                  │   │                  │
   │ Related Reports  │   │ Protected Access │
   │ Community Layer  │   │ No Public Layer  │
   └────────┬─────────┘   └────────┬─────────┘
            │                      │
            └──────────┬───────────┘
                       │
                       ▼
             ┌─────────────────────┐
             │ GOVERNMENT          │
             │ DEPARTMENT          │
             │                     │
             │ Receive             │
             │ Assign              │
             │ Investigate         │
             │ Update              │
             │ Resolve             │
             └──────────┬──────────┘
                        │
                        ▼
             ┌─────────────────────┐
             │ CENTRALIZED         │
             │ AUTHORITY DASHBOARD │
             │                     │
             │ Pending Cases       │
             │ Recurring Issues    │
             │ Priority Areas      │
             │ Overall Monitoring  │
             └──────────┬──────────┘
                        │
                        ▼
             ┌─────────────────────┐
             │ CITIZEN TRACKING &  │
             │ VERIFICATION        │
             │                     │
             │ Verify              │
             │ Reopen              │
             │ Escalate            │
             └─────────────────────┘
```
