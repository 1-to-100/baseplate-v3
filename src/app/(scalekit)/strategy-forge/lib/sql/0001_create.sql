-- =============================================================================
-- STRATEGY FORGE FEATURE - DATABASE SCHEMA
-- =============================================================================
-- This script creates the Strategy Forge data model, including the primary
-- company strategy record, supporting entities (principles, values, competitor
-- intelligence, change logs), option tables, indexes, triggers, and RLS.
-- =============================================================================

-- =============================================================================
-- SECTION 1: OPTION TABLES (SYSTEM SCOPE)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.option_publication_status (
  option_id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  programmatic_name   text NOT NULL,
  display_name        text NOT NULL,
  description         text,
  sort_order          integer NOT NULL DEFAULT 0,
  is_active           boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT option_publication_status_programmatic_name_uk
    UNIQUE (programmatic_name),
  CONSTRAINT option_publication_status_display_name_ck
    CHECK (char_length(display_name) > 0)
);

COMMENT ON TABLE public.option_publication_status IS
  'System-wide publication states for company strategies (draft, published, scheduled, archived).';


CREATE TABLE IF NOT EXISTS public.option_competitor_status (
  option_id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  programmatic_name   text NOT NULL,
  display_name        text NOT NULL,
  description         text,
  sort_order          integer NOT NULL DEFAULT 0,
  is_active           boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT option_competitor_status_programmatic_name_uk
    UNIQUE (programmatic_name),
  CONSTRAINT option_competitor_status_display_name_ck
    CHECK (char_length(display_name) > 0)
);

COMMENT ON TABLE public.option_competitor_status IS
  'System option set describing competitor lifecycle (active competitor, partner, monitored, etc.).';


CREATE TABLE IF NOT EXISTS public.option_competitor_signal_type (
  option_id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  programmatic_name   text NOT NULL,
  display_name        text NOT NULL,
  description         text,
  sort_order          integer NOT NULL DEFAULT 0,
  is_active           boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT option_competitor_signal_type_programmatic_name_uk
    UNIQUE (programmatic_name),
  CONSTRAINT option_competitor_signal_type_display_name_ck
    CHECK (char_length(display_name) > 0)
);

COMMENT ON TABLE public.option_competitor_signal_type IS
  'System option set describing competitor signal/event types (pricing change, launch, funding, etc.).';


CREATE TABLE IF NOT EXISTS public.option_data_source (
  option_id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  programmatic_name   text NOT NULL,
  display_name        text NOT NULL,
  description         text,
  sort_order          integer NOT NULL DEFAULT 0,
  is_active           boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT option_data_source_programmatic_name_uk
    UNIQUE (programmatic_name),
  CONSTRAINT option_data_source_display_name_ck
    CHECK (char_length(display_name) > 0)
);

COMMENT ON TABLE public.option_data_source IS
  'System option set identifying the source of competitor records or signals (manual, site scan, import, LLM).';


CREATE TABLE IF NOT EXISTS public.option_strategy_change_type (
  option_id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  programmatic_name   text NOT NULL,
  display_name        text NOT NULL,
  description         text,
  sort_order          integer NOT NULL DEFAULT 0,
  is_active           boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT option_strategy_change_type_programmatic_name_uk
    UNIQUE (programmatic_name),
  CONSTRAINT option_strategy_change_type_display_name_ck
    CHECK (char_length(display_name) > 0)
);

COMMENT ON TABLE public.option_strategy_change_type IS
  'System option set enumerating change log event types for the strategy workspace.';


-- Default values for option tables
INSERT INTO public.option_publication_status (programmatic_name, display_name, description, sort_order)
VALUES
  ('draft', 'Draft', 'Content is in progress and not yet published to downstream consumers.', 10),
  ('scheduled', 'Scheduled', 'Publish-ready content with a future effective date.', 20),
  ('published', 'Published', 'Content currently in effect and visible across the platform.', 30),
  ('archived', 'Archived', 'Historically referenced content no longer considered active.', 40)
ON CONFLICT (programmatic_name) DO NOTHING;

INSERT INTO public.option_competitor_status (programmatic_name, display_name, description, sort_order)
VALUES
  ('active_competitor', 'Active Competitor', 'Direct competitor actively encountered in deals or market motions.', 10),
  ('monitored', 'Monitored', 'Emerging or tangential player being tracked for potential impact.', 20),
  ('partner', 'Partner', 'Partner or ecosystem participant with cooperative positioning.', 30),
  ('potential_threat', 'Potential Threat', 'Company showing early signals that could evolve into a direct threat.', 40),
  ('retired', 'Retired', 'Competitor no longer relevant or out of market.', 50)
ON CONFLICT (programmatic_name) DO NOTHING;

INSERT INTO public.option_competitor_signal_type (programmatic_name, display_name, description, sort_order)
VALUES
  ('pricing_change', 'Pricing Change', 'Updates to public pricing, plans, or packaging.', 10),
  ('feature_launch', 'Feature Launch', 'New feature, product, or roadmap milestone announcement.', 20),
  ('funding_round', 'Funding Round', 'Capital raise or strategic investment announcement.', 30),
  ('hiring_signal', 'Hiring Signal', 'Notable hiring activity, leadership additions, or team expansion.', 40),
  ('go_to_market_move', 'Go-To-Market Move', 'Significant GTM or commercial motion, such as channel programs or market entries.', 50),
  ('partnership', 'Partnership', 'Strategic alliance, integration, or partnership announcement.', 60)
ON CONFLICT (programmatic_name) DO NOTHING;

INSERT INTO public.option_data_source (programmatic_name, display_name, description, sort_order)
VALUES
  ('manual', 'Manual Entry', 'Record curated manually by an internal user.', 10),
  ('site_scan', 'Site Scan', 'Automated ingestion from public web sources.', 20),
  ('llm_suggestion', 'LLM Suggestion', 'Suggested by the AI assistant for analyst review.', 30),
  ('import', 'Import', 'Bulk import via CSV or integration.', 40),
  ('partner_feed', 'Partner Feed', 'Synchronized from partner or third-party data providers.', 50)
ON CONFLICT (programmatic_name) DO NOTHING;

INSERT INTO public.option_strategy_change_type (programmatic_name, display_name, description, sort_order)
VALUES
  ('edit_mission', 'Edited Mission', 'Mission statement updated or rewritten.', 10),
  ('edit_vision', 'Edited Vision', 'Vision statement updated or rewritten.', 20),
  ('add_principle', 'Added Principle', 'New strategic principle added to the workspace.', 30),
  ('update_principle', 'Updated Principle', 'Existing strategic principle edited.', 40),
  ('reorder_principles', 'Reordered Principles', 'Principles reordered to reflect priority changes.', 50),
  ('add_value', 'Added Value', 'New company value introduced.', 60),
  ('update_value', 'Updated Value', 'Existing company value updated.', 70),
  ('reorder_values', 'Reordered Values', 'Company values reordered to reflect priority changes.', 80),
  ('publish', 'Published Strategy', 'Strategy published or republished to the organization.', 90),
  ('archive', 'Archived Strategy', 'Strategy archived or retired from active use.', 100)
ON CONFLICT (programmatic_name) DO NOTHING;


-- Default values for customer_journey_stages_singleton
INSERT INTO public.customer_journey_stages_singleton (journey_phase, name, description, graduation_criteria, order_index, code)
VALUES
  ('Marketing', 'Known', 'A Contact in the Known stage exists in our CRM or Marketing Automation Platform (MAP) but has not explicitly engaged with us or opted into our communications. They may have been imported, inferred, or identity-matched to website or content activity, but we do not yet have clear consent or meaningful product engagement. Marketing''s job is to warm these contacts, capture consent where appropriate, and either promote them into Subscriber or, if engagement and fit thresholds are met, directly into MQL.', 'Graduation criteria for moving a contact out of Known:

- The contact has explicitly opted in to receive marketing communications and should be promoted to Subscriber.
  - Inspect: In the CRM or MAP, the Marketing Subscription / Consent Status (or equivalent) is set to an "Opted In" value, indicating explicit permission to receive ongoing marketing communications.

- OR the contact has reached the minimum Lead Score threshold required for their Lead Grade, justifying promotion directly to MQL.
  - Inspect: Confirm that the lead''s current Lead Score meets or exceeds the promotion score for their assigned Lead Grade, as defined in your scoring and grading model. When the score threshold is met, a workflow promotes the contact to MQL and assigns a sales owner.', 1, 'known'),
  ('Marketing', 'Subscriber', 'A Subscriber has explicitly opted in to receive content from us (for example, newsletters, blog updates, or other marketing emails) but has not yet demonstrated sufficient product interest to justify sales outreach. This pool contains a mix of early-stage prospects and a large set of people who may never become customers. No sales contact occurs at this stage; Marketing focuses on building awareness, trust, and progressively enriching the contact record (e.g., job title, company size) so future qualification is possible.', 'Graduation criteria for moving a contact out of Subscriber:

- The contact has reached the minimum Lead Score required for their Lead Grade to justify sales outreach.
  - Inspect: Using your Lead Scoring and Lead Grading model, verify that the contact''s Lead Score meets or exceeds the promotion threshold for their assigned Grade (A–D). When the threshold is met, automation promotes the contact to MQL, suspends most marketing nurture while in active sales motion, and assigns the lead to a sales owner.

- If the lead is later rejected by Sales as unqualified, they may be demoted back to Subscriber (or Known) with a standardized reason code.
  - Inspect: Ensure that a rejection reason is stored in the CRM, and that the lifecycle stage has been updated by workflow or manual reassignment to reflect the demotion.', 2, 'subscriber'),
  ('Marketing', 'Marketing Qualified Lead (MQL)', 'A Marketing Qualified Lead (MQL) is a contact that Marketing has determined is ready for an initial sales conversation. The lead is generally a strong ICP fit (via Lead Grade) and has demonstrated meaningful intent or engagement (via Lead Score). Promotion into MQL is governed by score–grade rules, not gut feel, and triggers handoff from Marketing to Sales Development for pursuit and qualification.', 'Graduation criteria for moving a lead out of MQL:

- The lead has been assigned to a named sales owner (SDR, BDR, AE, or equivalent).
  - Inspect: In the CRM, confirm that the Owner field is populated with a specific, active sales representative (not a default queue or placeholder owner).

- The assigned sales rep has explicitly accepted the lead for pursuit, promoting it to Sales Accepted Lead (SAL).
  - Inspect: Confirm that the lifecycle or status field has moved from MQL to SAL, and that any required acceptance fields (e.g., "Accepted by Sales" or "SAL Date") are populated.

- OR the assigned sales rep has explicitly rejected the lead for pursuit, causing demotion to Subscriber or Known.
  - Inspect: Ensure a standardized rejection reason code or note is present (e.g., bad data, no fit, student, wrong geography) and that a workflow or manual action updates the lifecycle stage and any related fields (e.g., nurture track, suppression flags).', 3, 'marketing_qualified_lead'),
  ('Marketing', 'Sales Accepted Lead (SAL)', 'A Sales Accepted Lead (SAL) is an MQL that has been reviewed and explicitly accepted by a sales rep as worth pursuing. At this point, Sales has agreed that the lead meets baseline pursuit criteria and will invest effort to engage, qualify, and schedule an initial meeting. The focus in SAL is active outreach, basic qualification, and determining whether this should become a real opportunity or be returned to Marketing.', 'Graduation criteria for moving a lead out of SAL:

- Initial outreach has been logged shortly after assignment.
  - Inspect: In the CRM activity history, confirm that at least one outreach activity (e.g., call, email, LinkedIn message) is logged within the target SLA (e.g., within 1 day of assignment).

- The rep has scheduled and attempted an initial qualification call within a reasonable time window.
  - Inspect: Check the activity history for a scheduled meeting or call within the agreed timeframe (e.g., within 7 days of initial outreach), and a completed activity log for the call within a defined period (e.g., within 14 days of scheduling).

- The rep has evaluated basic qualification criteria (e.g., BANT or MEDDIC) and determined whether the lead is a valid opportunity.
  - Inspect: Confirm that qualification-related fields (Budget, Authority, Need, Timeline, etc.) are filled in the CRM opportunity or lead record, or captured in structured call notes.

- If the rep confirms this is a valid opportunity, they create an opportunity and promote the lead to Sales Qualified Lead (SQL).
  - Inspect: Verify that an Opportunity record exists, associated to the contact or account, and that the lifecycle/status has moved to SQL.

- If the rep disqualifies the lead (e.g., no fit, bad data, no budget, wrong timing), the lead is demoted, and disqualification details are recorded.
  - Inspect: Ensure the lead is demoted to Known (or appropriate non-active stage), Lead Score reset if applicable, Lead Grade set to F where appropriate, Disqualification Date and Disqualification Reason fields are populated, and the disqualifying rep is recorded.

A healthy system also tracks SAL acceptance rate and uses structured reviews of SAL rejections to refine scoring and grading over time.', 4, 'sales_accepted_lead'),
  ('Marketing', 'Sales Qualified Lead (SQL)', 'A Sales Qualified Lead (SQL) is a fully qualified lead that has been converted into an opportunity. Sales has validated that the prospect broadly meets the company''s qualification framework (e.g., BANT or MEDDIC), and the account is now in an active sales cycle. At SQL, Marketing''s role shifts from nurturing to enabling Sales with collateral, while Sales drives the opportunity through the pipeline stages.', 'Graduation criteria for moving a record out of SQL and into the Sales pipeline:

- An opportunity record has been created and associated with the account/contact.
  - Inspect: Confirm in the CRM that an Opportunity object exists, linked to the account and/or primary contact, with the Stage set to the first active sales stage (e.g., "Discovery").

- A formal handoff from SDR/BDR to the primary Sales rep has been completed.
  - Inspect: Verify that any standardized MQL-to-SQL handoff checklist or form is completed and attached to the opportunity, including key context, qualification notes, and agreements.

- An initial Discovery Call has been scheduled with the Sales rep who owns the opportunity.
  - Inspect: Check the Activity History or Meeting Log for a scheduled Discovery or first-qualification meeting associated to the opportunity.

Once these are true, the primary journey phase is considered to have shifted from Marketing to Sales, and the opportunity begins moving through the Sales stages (Discovery, Presentation, etc.).', 5, 'sales_qualified_lead'),
  ('Sales', 'Discovery', 'Discovery is the first active Sales stage after an opportunity is created. The Sales rep (often an AE) is engaging the prospect to understand their needs, context, and buying process. The emphasis is on diagnosing rather than pitching: validating that this is a real, winnable opportunity by confirming need, budget, authority, and timing through a structured discovery conversation.', 'Graduation criteria for moving an opportunity out of Discovery:

- A discovery or qualification call has been completed with the primary buyer contact and, where possible, other key stakeholders.
  - Inspect: In CRM Activity History, verify a completed meeting or call labeled "Discovery" or "Qualification" and associated with the opportunity.

- Key qualification criteria (e.g., BANT or MEDDIC) have been evaluated and recorded.
  - Inspect: Confirm that custom opportunity fields such as Budget Confirmed, Decision Maker Identified, Timeline Known, and business pain/use case fields are populated, or that structured notes capturing these details are attached to the opportunity.

- The customer has confirmed an active need and intent to evaluate solutions in the near term.
  - Inspect: Review notes or fields capturing project timing, pain points, and use cases. These should reflect concrete business issues and timelines rather than vague or generic placeholders.

- The sales rep has validated that this opportunity is worth pursuing and has moved the opportunity to the next active Sales stage (e.g., Presentation).
  - Inspect: In the CRM pipeline, confirm that the Opportunity Stage has moved from Discovery to the next defined stage, and that any "Sales Qualification Complete" or equivalent flag is set to true.

If the opportunity is found not worth pursuing (e.g., no budget this year, no meaningful project), the rep may pause or close the opportunity rather than advancing it.', 1, 'discovery'),
  ('Sales', 'Presentation', 'In the Presentation stage, the Sales team demonstrates how the product addresses the prospect''s specific needs identified during Discovery. This usually involves a tailored pitch, a live product demo, and early solution positioning. Depending on complexity, there may be multiple demos for different stakeholder groups. The goal is to show clear alignment between the prospect''s problems and your solution, and to secure agreement to move deeper into evaluation or commercial discussions.', 'Graduation criteria for moving an opportunity out of Presentation:

- A product demo or tailored solution presentation has been delivered to key stakeholders.
  - Inspect: Confirm a logged "Demo," "Presentation," or "Solution Overview" meeting in the CRM Activity History with date, attendees, and notes, and that any decks or recordings are attached to the opportunity.

- Customer stakeholders have seen how the solution addresses their specific needs and use cases.
  - Inspect: Review opportunity notes and any custom "Solution Requirements" or "Use Case Mapping" fields, ensuring they reflect the pain points and mapped features discussed in the demo.

- The customer has expressed interest in continuing the buying process.
  - Inspect: Validate a documented next step in the CRM (e.g., proposal review, deeper technical evaluation, stakeholder alignment meeting) and that the opportunity is advanced in the pipeline.

- The AE has identified key stakeholders involved in the buying process (decision makers, evaluators, influencers, etc.).
  - Inspect: Verify that buyer roles and stakeholder records are attached to the opportunity in the CRM, with at least the primary decision-maker and evaluator identified.

Once these are in place and there is agreement to move forward, the opportunity typically advances to the Proposal stage.', 2, 'presentation'),
  ('Sales', 'Proposal', 'In the Proposal stage, the Sales team presents a formal commercial offer including pricing, scope, and key terms. This usually triggers internal discussions on the customer side involving procurement, legal, finance, and sometimes security. Negotiations begin around price, scope, and contractual details, and the Sales rep guides the buyer through their internal procurement process while keeping momentum.', 'Graduation criteria for moving an opportunity out of Proposal:

- A formal proposal, quote, or pricing document has been shared with the prospect.
  - Inspect: In the CRM or CPQ system, confirm a "Proposal Sent" date, attached quote document, or a record in the Documents/Attachments section linked to the opportunity.

- Pricing, commercial terms, and solution scope have been discussed with the buyer.
  - Inspect: Check fields such as Quote Summary, Pricing Agreed (draft), and Solution Scope for updates reflecting what was reviewed, and cross-check with meeting notes.

- The customer has acknowledged receipt and is actively reviewing the proposal.
  - Inspect: Review communication logs for confirmation (email, call notes), or use document tracking tools (e.g., DocuSign, PandaDoc, HubSpot quotes) to verify views and activity.

- Objection handling or preliminary negotiations have started.
  - Inspect: Look for notes about discount requests, redlines, procurement questions, or objections, and confirm that these are captured in Negotiation Notes, Pricing Concerns, or similar CRM fields.

When the customer indicates they want to move forward pending internal approvals and formal commitment, the deal typically advances to Verbal.', 3, 'proposal'),
  ('Sales', 'Verbal', 'In the Verbal stage, key stakeholders have given an informal or verbal commitment to move forward with the purchase. The primary focus now is guiding the customer through their internal procurement, legal, and approval process. The Sales rep plays the role of coach and facilitator, helping the buyer navigate steps they may not be familiar with and ensuring the deal progresses toward formal contracting and signature.', 'Graduation criteria for moving an opportunity out of Verbal:

- The customer has given a clear verbal commitment to move forward with the purchase.
  - Inspect: Check the Verbal Commit Date field or review activity notes showing explicit confirmation from a qualified buyer (e.g., "Customer confirmed they want to proceed pending paperwork and approvals").

- The customer''s internal procurement or finance process has been formally initiated.
  - Inspect: Confirm updates in fields such as Procurement Status or related notes indicating that vendor onboarding, PO processing, or contract routing has begun, ideally with a named procurement contact rather than a generic accounting inbox.

- The sales rep has documented the customer''s buying process and the remaining internal steps to get the deal signed.
  - Inspect: Review notes or a specific "Buying Process Steps" field describing required approvals, systems, and timelines; some teams attach a buying journey checklist or map.

- The customer''s timeline and intended close date are clearly defined and recorded.
  - Inspect: Ensure that Close Date, Target Go-Live Date, or Expected Signature Date fields are populated and consistent with what was agreed during the verbal commitment conversation.

Once the customer has progressed into detailed contracting—where redlines and formal legal review dominate—the opportunity generally moves to Contracting.', 4, 'verbal'),
  ('Sales', 'Contracting', 'In the Contracting stage, the deal is moving through formal legal, procurement, and risk review. Contracts are being redlined, security and compliance reviews are underway, and all final internal approvals are being secured. This is typically the highest-confidence forecast category before Commit, though timing can still slip due to customer-side process delays.', 'Graduation criteria for moving an opportunity out of Contracting:

- The contract has been sent to the customer and is under legal/procurement review.
  - Inspect: Confirm a Contract Sent Date and an attached contract or link in the CRM or contract lifecycle management (CLM) system, with status set to "Under Review" or equivalent.

- Redlines or contract negotiations are actively underway and being tracked.
  - Inspect: Review version history, tracked changes, or negotiation notes in the Contract Notes field or associated documentation, showing active progress.

- Security, compliance, or legal stakeholders (on both sides, as needed) have been engaged and are addressing open issues.
  - Inspect: Check Security Review Status, Legal Status, and related fields; notes should capture any remaining blockers and progress on resolving them.

- The Sales rep and customer champion are actively driving closure across all internal steps.
  - Inspect: Review activity logs for recent communication with the champion and internal stakeholders, along with tasks or reminders assigned to ensure follow-through.

Once terms are fully agreed, final approvals secured, and the customer is ready to sign on a specific timeline, the deal advances to Commit.', 5, 'contracting'),
  ('Sales', 'Commit', 'Commit is the stage where all commercial terms, legal language, and scope have been agreed by both parties, and the customer has committed to a formal close date. The only remaining steps are final signatures and payment mechanics. This is the highest-confidence forecast state: the deal is effectively done unless something unexpected intervenes.', 'Graduation criteria for moving an opportunity out of Commit:

- Final contract terms have been agreed upon by both parties, with no open legal or commercial redlines.
  - Inspect: Confirm fields such as Final Terms Accepted or equivalent are set to true, and check that contract versions show no outstanding issues.

- The customer has communicated a specific, formal close date or signature date.
  - Inspect: Verify that Close Date Confirmed By Customer (or similar) is populated and matches notes from recent conversations.

- Sales has a committed signature process in flight (e.g., contract in DocuSign, PO request in process).
  - Inspect: In the CLM or e-signature platform, confirm status such as "Pending Signature" or similar; in CRM, confirm that Signature Workflow Initiated and/or PO Requested flags are set.

- All internal and external blockers have been cleared.
  - Inspect: Ensure any Deal Blockers field is empty or set to "None," and that required internal approvals (e.g., deal desk, discount approvals) are logged as complete.

- The contract has been fully signed by the customer.
  - Inspect: Confirm that a final, signed contract is attached to the account/opportunity in the CRM and that the contract status is set to fully executed.

- A method of payment is in place and valid (e.g., a funded PO or confirmed credit card).
  - Inspect: For PO-based deals, ensure the PO has been received, funded, and recorded; for card-based deals, confirm the payment method is on file and active.

When both a signed contract and a valid payment mechanism are in place, the deal can be marked Closed - Won.', 6, 'commit'),
  ('Sales', 'Closed - Won', 'Closed - Won indicates that the customer has completed the purchase: the contract is fully executed, payment mechanics are in place, and the opportunity is won. At this point, Sales transitions the account to Onboarding and Customer Success, ensuring that all critical context and promises are captured so the team can deliver on what was sold.', 'Graduation criteria for Closed - Won:

- Sales to Customer Success / Onboarding handoff has been completed.
  - Inspect: Confirm that a handoff document or checklist is filled out and attached to the CRM record, capturing customer goals, key stakeholders, special requirements, risks, and commitments made during the sales process, and that an internal handoff meeting has been held or scheduled.

- Billing is fully configured and active.
  - Inspect: In billing systems, verify that the customer''s subscription, invoicing, and payment method are set up and active, and that initial invoices or charges are scheduled or sent.

- A renewal opportunity has been created.
  - Inspect: Confirm that a renewal opportunity or renewal record has been created with the correct contract end date, forecasted renewal amount, and ownership assigned to the appropriate CSM/AM or Sales rep.

- Win analysis has been completed.
  - Inspect: Check that win reasons, competitors, and key factors are documented in the CRM so future deals can benefit from these insights.

Once these are complete, ownership transitions operationally from Sales to Onboarding, and the account enters the Onboarding phase.', 7, 'closed_won'),
  ('Sales', 'Closed - Lost', 'Closed - Lost indicates that the opportunity did not close in our favor. The prospect either chose a competitor, deferred the decision, lacked budget, or otherwise did not proceed. Sales documents why the deal was lost, hands contacts back to Marketing or nurture programs as appropriate, and, when possible, conducts a brief post-mortem and a courteous close-out with the prospect.', 'Graduation criteria for Closed - Lost:

- The opportunity has been set to Closed - Lost with a standardized loss reason.
  - Inspect: Verify that the Opportunity Stage is Closed - Lost and that a Loss Reason field (e.g., Chose Competitor, No Budget, No Decision, Poor Fit) is populated.

- All relevant contacts have been returned to Marketing or the appropriate nurture destination.
  - Inspect: Confirm that lifecycle stages on associated contacts are updated (e.g., to Known or Subscriber) and that they are enrolled in an appropriate nurture or long-term follow-up path as needed.

- Loss information and a brief loss analysis have been captured.
  - Inspect: Check that loss analysis notes are stored in the CRM (e.g., what worked, what didn''t, any signals missed, competitive insights), and that any "Loss Analysis Complete" or equivalent field is set.

- (Optional but recommended) A courteous follow-up or close-out message has been sent by the AE.
  - Inspect: Review activity history for a final email or call thanking the prospect for their time and leaving the door open for future conversations.', 8, 'closed_lost'),
  ('Onboarding', 'Internal Handoff', 'Internal Handoff is the first Onboarding stage after a deal is Closed - Won. Sales formally transitions the account to Onboarding and Customer Success, sharing context on what was sold, why the customer bought, who the stakeholders are, and what success looks like. An onboarding owner is assigned and internal teams align on the implementation approach before contacting the customer for kickoff.', 'Graduation criteria for moving out of Internal Handoff:

- Sales-to-CS/Onboarding handoff has been fully completed, including goals, stakeholders, and deal context.
  - Inspect: Confirm a completed handoff checklist or document attached to the CRM opportunity/account, capturing customer objectives, promised outcomes, key risks, and the sold configuration.

- The customer has been assigned an Onboarding owner or project manager.
  - Inspect: Verify that an Onboarding Owner (or equivalent) field is populated with a specific named individual, not left blank or assigned to a placeholder queue.

- Internal kickoff meeting (Sales + Onboarding/CS) has occurred.
  - Inspect: In the CRM Activity History or onboarding tracker, confirm a completed internal kickoff meeting with notes and clear next steps, including confirmation of any technical prerequisites (e.g., integrations, whitelisting, access requirements).

Once these are complete, the team is ready to initiate the customer-facing Kickoff Meeting.', 1, 'internal_handoff'),
  ('Onboarding', 'Kickoff Meeting', 'The Kickoff Meeting is the first structured interaction with the customer''s project team after the sale. Both sides introduce key stakeholders, align on goals, clarify scope, and agree on timelines and responsibilities. This meeting sets expectations, confirms what success looks like, and establishes the tone and working relationship for the rest of onboarding.', 'Graduation criteria for moving out of Kickoff Meeting:

- A customer-facing kickoff call has occurred with the core stakeholders present.
  - Inspect: In CRM Activity History or the onboarding tracker, verify a completed kickoff meeting entry including the attendee list and meeting notes.

- Project plan, scope, and high-level timeline have been reviewed and agreed upon.
  - Inspect: Check the shared onboarding project plan or tracker for customer approval or a "Kickoff Plan Signed Off" indicator, and ensure that major milestones and dates are documented.

- Roles and responsibilities on both sides have been clearly defined and acknowledged.
  - Inspect: Confirm that the project documentation includes explicit "Customer Responsibilities" and "Our Responsibilities," and that these were reviewed during the meeting.

- Onboarding success criteria have been documented and confirmed with the customer.
  - Inspect: Verify that Onboarding Success Criteria fields (e.g., number of users live, specific workflows enabled, target dates) are populated in the CRM or onboarding system.

Once these conditions are met, onboarding moves into active Configuration work.', 2, 'kickoff_meeting'),
  ('Onboarding', 'Configuration', 'Configuration is the stage where the product is technically implemented for the customer. The team provisions the environment, configures settings, integrates with the customer''s systems (e.g., CRM, SSO), and imports initial data. Regular check-ins and strong project management keep implementation on track, and by the end of this stage, the core system is ready for user training and production use.', 'Graduation criteria for moving out of Configuration:

- The customer''s environment or account has been provisioned and initial access granted.
  - Inspect: Confirm that Instance Provisioned, Login Credentials Sent, or equivalent fields are marked complete, and ideally that at least one customer admin has successfully logged in.

- Planned integrations (e.g., SSO, CRM connections, data pipelines) have been configured and validated.
  - Inspect: Review the onboarding project plan or checklist for integration tasks marked complete, and confirm success via internal test logs or customer confirmation that data is flowing or SSO is working.

- Initial data (such as users, historical records, or configuration data) has been loaded into the system.
  - Inspect: Validate in admin tools or back-end dashboards that expected records are present and correct, and that any data import tasks in the onboarding tracker are marked complete.

- Core configurations (roles, permissions, branding, workflows, etc.) are complete and align with agreed scope.
  - Inspect: Check the Configuration Checklist or equivalent artifact to ensure all critical configurations are marked done and, where applicable, have been reviewed with the customer.

When core implementation tasks are complete and validated, onboarding can move into Customer Training & Enablement.', 3, 'configuration'),
  ('Onboarding', 'Customer Training & Enablement', 'Customer Training & Enablement focuses on equipping the customer''s users and admins to successfully use the product. The onboarding team delivers training sessions, shares documentation and tutorials, and supports the customer in achieving an early "a-ha moment" where they clearly see value. This stage bridges the gap between a configured system and one that users actually adopt in their day-to-day work.', 'Graduation criteria for moving out of Customer Training & Enablement:

- Training sessions have been delivered to all key user groups (e.g., admins, power users, end-users).
  - Inspect: Review training logs, calendar events, or LMS records for completed sessions, including attendance and any recordings or recap notes.

- The customer has achieved a clear first value realization ("a-ha moment") with the product.
  - Inspect: Look for documented customer feedback or CSM notes indicating specific examples of value (e.g., "We just built our first report using our data and it saved us hours"), and confirm this is captured in onboarding notes.

- Users demonstrate basic fluency with the platform and can complete critical workflows.
  - Inspect: Check product analytics for user activity around key actions, or validate completion of defined training tasks (e.g., "Create your first dashboard," "Configure a workflow") assigned to participants.

- Each user knows how to get support and where to find self-service resources.
  - Inspect: Confirm that a Support Orientation checklist item is complete, and that the customer has been shown how to access help centers, ticketing, or in-app assistance.

- Enablement materials (guides, videos, FAQs, etc.) have been delivered and acknowledged.
  - Inspect: Verify delivery via email, shared folder, or LMS, and confirm acknowledgment in follow-up communications or the onboarding tracker.

- An ongoing check-in or success review (monthly or quarterly) has been scheduled.
  - Inspect: Check the CRM or calendar for a scheduled future-dated check-in or QBR and that it is associated with the account.

Once training and enablement objectives are met and early value is visible, the account is ready to Go Live.', 4, 'customer_training_enablement'),
  ('Onboarding', 'Go Live', 'Go Live marks the point where the customer begins active, day-to-day use of the product in production. Onboarding work is effectively complete, early issues have been addressed, and ownership transitions fully to Customer Success. The Go Live milestone is acknowledged explicitly with the customer so that everyone understands onboarding is done and the long-term success phase has begun.', 'Graduation criteria for completing Go Live (and exiting Onboarding):

- The customer has begun active, production use of the product.
  - Inspect: Review usage analytics for healthy adoption metrics (e.g., expected login rates, number of active users, and completion of key workflows) over a defined period.

- The post-launch stabilization window (e.g., first 2–4 weeks) shows stable system use without major unresolved issues.
  - Inspect: Check the support ticketing system for critical issue volume and confirm that there are no open, high-severity bugs or escalations blocking normal use.

- The customer confirms that the solution is meeting initial expectations and is "live."
  - Inspect: Look for customer confirmation via email, survey, or call notes, and/or a Go-Live Verified field set to true in the CRM or onboarding tracker.

- A transition meeting (onboarding debrief and/or first QBR) has been held and CS handoff is complete.
  - Inspect: Verify a completed meeting record in the CRM with notes revisiting onboarding success criteria, gathering feedback, and introducing the ongoing Customer Success Manager as the main point of contact.

- Onboarding project or implementation ticket has been closed with an Onboarding Complete date.
  - Inspect: Confirm that Onboarding Complete and CSM Assigned fields are populated, and that the onboarding project has a formal close date recorded.

After these criteria are met, the account leaves the Onboarding phase and enters the Customer Success phase.', 5, 'go_live'),
  ('Customer Success', 'Adoption', 'In the Adoption stage, the customer has completed onboarding and is actively using the product in their day-to-day operations. The Customer Success team focuses on driving deeper utilization, ensuring that primary users adopt the product, and confirming that early success metrics are trending in the right direction. Healthy adoption is the foundation for long-term retention and expansion.', 'Graduation criteria for moving out of Adoption:

- Primary users and teams are logging in regularly and completing core actions.
  - Inspect: Use product telemetry or admin reports to confirm consistent usage by target personas (logins, core workflows, feature interaction) relative to expectations for the account.

- Initial success metrics or KPIs are being tracked against agreed baselines.
  - Inspect: Review the Success Plan or QBR deck to confirm that specific goals (e.g., "reduce onboarding time by 20%") are documented and that tracking fields have both baseline and initial performance values.

- The account meets or exceeds defined health score thresholds for usage, support activity, and satisfaction.
  - Inspect: In your CS platform (e.g., Gainsight, ChurnZero), verify that the Customer Health Score is in the "healthy" or "green" band based on your configured scoring model.

- Regular check-ins (monthly or quarterly) with the customer are occurring and documented.
  - Inspect: Confirm recurring meetings are scheduled and logged in the CRM, with notes reflecting progress, issues, and agreed action items.

When adoption is stable and consistent, the account is effectively in an ongoing Engagement state where value can be deepened and expansion opportunities explored.', 1, 'adoption'),
  ('Customer Success', 'Engagement', 'In the Engagement stage, the customer is using the product regularly and as intended. Customer Success focuses on proactively maintaining strong usage, monitoring early warning signs of churn, and identifying opportunities to expand the relationship. Some accounts in Engagement become candidates for Evangelist status; others may show signals that move them into At Risk and require a formal save plan.', 'Graduation criteria for changes from Engagement:

Promotion toward Evangelist:

- The customer is consistently using advanced or high-value features of the product beyond basic usage.
  - Inspect: Review product analytics for adoption of "power features" or modules tied to key value propositions, not just simple, limited usage.

- The account shows no current signs of dissatisfaction or disengagement.
  - Inspect: Check support ticket sentiment, CSM notes, and recent NPS/CSAT responses for absence of severe issues, escalations, or negative feedback.

- The customer is achieving measurable business results tied directly to your product.
  - Inspect: In Customer Outcomes documentation, QBR decks, or success plans, look for validated results (e.g., "reduced support cost by 40%," "20% faster project delivery").

- The customer expresses high satisfaction (e.g., NPS scores of 9–10, top-box CSAT).
  - Inspect: Review recent survey responses and tag the account as a Promoter or equivalent advocate category.

- The customer is willing to act as a reference in the market.
  - Inspect: Confirm that the customer has explicitly agreed to be a reference, participate in case studies, speak at events, or provide testimonials, and that this is logged in marketing or CS advocacy records.

When these conditions are met, the account can be promoted to Evangelist.

Flagging At Risk:

- Usage or engagement shows a downward trend over time.
  - Inspect: Review usage dashboards for declining logins, reduced feature adoption, or lower activity against baseline.

- Support tickets are increasing in volume, severity, or negative sentiment.
  - Inspect: Examine the help desk or ticketing system for spikes in ticket count, frequent escalations, or unresolved issues.

- The customer has raised concerns in meetings, emails, or surveys about value, fit, or outcomes.
  - Inspect: Check CS call summaries, CRM notes, and NPS/CSAT surveys for negative feedback or explicit concerns.

When these warning signs are present, the account should be flagged as At Risk and moved to that stage with a formal recovery plan.', 2, 'engagement'),
  ('Customer Success', 'Renewal', 'The Renewal stage begins 180–90 days before the contract end date. The CSM prepares and executes the renewal strategy: confirming ongoing value, identifying potential risks, determining whether expansion or changes are appropriate, and ultimately securing the renewal commitment and commercial paperwork. Renewal is where the account "re-qualifies" the relationship based on value delivered.', 'Graduation criteria for completing Renewal for a given term:

- The customer is within the defined renewal window (typically 180–90 days before contract end).
  - Inspect: In the CRM or billing system, confirm that the Contract End Date falls within this renewal timeframe and that a renewal opportunity or task has been created.

- The CSM has completed renewal preparation, including an account review and value realization assessment.
  - Inspect: Verify a completed Renewal Prep Checklist or account review document in the CRM or CS platform, with fields such as Renewal Strategy, Expansion Opportunity, and Churn Risk filled out.

- Renewal options and commercial terms have been presented to the customer.
  - Inspect: Confirm that a renewal proposal, quote, or order form has been generated and sent, and that this is logged in the CRM or CPQ system.

- Renewal intent (renew, not renew, or undecided) has been captured along with any risks or blockers.
  - Inspect: Ensure that Renewal Likelihood or Churn Risk fields are updated and that CS notes capture the customer''s stated intent and any major issues.

- For the renewal opportunity, the relevant Commit-stage criteria (for that renewal) have been met, including agreed terms and payment method.
  - Inspect: Cross-check the renewal opportunity against your Commit stage requirements (e.g., agreed terms, planned close date, contract in signature).

Upon successful renewal (Closed - Won on the renewal opportunity), the account continues in Customer Success; if not renewed, the account proceeds toward Offboarding and Churned.', 3, 'renewal'),
  ('Customer Success', 'At Risk', 'The At Risk stage is an early warning and active recovery state. The account shows signs of dissatisfaction, declining usage, or heightened risk of churn. Customer Success responds with a structured save plan, targeted interventions, and close monitoring. The objective is to restore adoption, stabilize sentiment, and return the customer to a healthy Engagement state.', 'Graduation criteria for moving out of At Risk:

- A formal save plan (or At Risk recovery plan) has been created, documented, and approved internally.
  - Inspect: In the CRM or CS platform, confirm a completed Save Plan including root cause analysis, specific action items, owners, timelines, and success criteria, attached to the account record.

- The CSM (and any cross-functional partners) has executed the save plan, including outreach, retraining, support, product adjustments, or escalations as needed.
  - Inspect: Review activity logs and task histories to verify that all planned actions (e.g., executive outreach, feature deep-dive sessions, extra support touchpoints) have been completed or rescheduled as needed.

- Key metrics (usage, adoption, or business outcomes) show sustained recovery and meet minimum adoption thresholds.
  - Inspect: Compare current platform analytics against your Adoption criteria, ensuring that usage has recovered to a healthy level (e.g., target percentage of active users, key workflows performed).

- Customer sentiment has stabilized, with recent feedback being neutral or positive.
  - Inspect: Review updated NPS/CSAT scores and recent call notes, looking for resolved concerns and non-negative sentiment.

- The customer acknowledges progress and indicates an intent to continue the partnership.
  - Inspect: Look for documented confirmation in call notes or email threads that the customer plans to stay, or early signals of renewal interest.

If these conditions are met, the account can be moved back into a healthy Engagement state. If recovery fails and the customer decides not to continue, the account moves into Offboarding and ultimately Churned.', 4, 'at_risk'),
  ('Customer Success', 'Evangelist', 'Evangelist describes a delighted customer who is consistently achieving strong results and actively advocates for your solution. These customers provide testimonials, participate in case studies, speak at events, or refer new business. They represent the highest level of relationship health and are invaluable for marketing, sales, and product feedback.', 'Graduation criteria and notes for Evangelist:

- There are no formal graduation criteria for leaving Evangelist; the focus is on maintaining this status.
  - Inspect: Continue to monitor usage, satisfaction, and advocacy activities to ensure the account remains healthy and engaged.

- Typical indicators that an account qualifies as an Evangelist include:
  - Measurable business outcomes attributable to your product are well documented.
  - Usage of advanced and high-value features is deep and consistent.
  - NPS/CSAT scores are high (e.g., NPS 9–10; 5/5 satisfaction).
  - The customer has agreed to, and is actively participating in, advocacy activities such as references, case studies, testimonials, and speaking engagements.
  - Internal champions are active and influential within the customer''s organization, advocating for your solution.

As long as these conditions are broadly true, the goal is simply to keep the customer in Evangelist by continuing to deliver outsized value and an excellent experience.', 5, 'evangelist'),
  ('Customer Success', 'Offboarding', 'Offboarding is the stage where a customer has decided to discontinue the subscription or not renew, and the team manages a professional, organized transition. The focus is on understanding why the customer is leaving, closing out billing and access cleanly, and preserving the relationship so that future re-engagement remains possible.', 'Graduation criteria for completing Offboarding:

- The customer has provided formal notice of cancellation or non-renewal.
  - Inspect: In the CRM or billing system, confirm that Subscription Status or Renewal Outcome is marked as "Cancelled," "Non-Renewing," or similar.

- An exit interview or offboarding call has been conducted to capture feedback and reasons for churn.
  - Inspect: Review activity logs for a completed Churn Call or Exit Interview, and ensure that a written summary of key insights is attached to the account.

- All billing and access deprovisioning tasks have been scheduled or completed.
  - Inspect: Verify in billing and internal tooling that final invoices are issued or reconciled, refunds handled if applicable, and product access deactivated per agreed timelines.

- Customer feedback and churn reasons are documented and categorized for analysis.
  - Inspect: Check Churn Reason, Churn Type, and Re-Engagement Potential fields in the CRM, and confirm that qualitative feedback is stored in notes for use in product and go-to-market improvements.

Once offboarding activities are completed and access is fully removed, the account is considered Churned.', 6, 'offboarding'),
  ('Customer Success', 'Churned', 'Churned indicates that the customer is no longer an active paying customer. Their subscription has ended, access has been removed, and the account is removed from active Customer Success management. The relationship may still be nurtured at a light-touch marketing level, but from a lifecycle standpoint, this is the terminal state for that subscription term.', 'Graduation criteria and handling for Churned:

- The customer''s contract term has ended without renewal, or the subscription was terminated early, and all offboarding steps have been completed.
  - Inspect: Confirm that Subscription Status is "Churned," "Cancelled," or equivalent, and that the Contract End Date is in the past relative to the termination date.

- Product access has been fully deprovisioned in accordance with contractual terms and customer expectations.
  - Inspect: Validate in internal systems that all user accounts, integrations, and data access have been disabled or removed, consistent with your data retention and security policies.

- All final billing actions and financial reconciliations are complete.
  - Inspect: Ensure that any final invoices are settled or written off as appropriate, and that the billing account shows no active subscriptions.

- Churn reasons and learnings have been recorded for reporting and continuous improvement.
  - Inspect: Verify that Churn Reason, Churn Category, and Re-Engagement Potential fields are populated, and that notes from exit conversations and internal analysis are stored with the account.

After an account is Churned, Marketing may optionally maintain the relationship in a low-intensity nurture or alumni program, but for the purposes of the customer journey, the active lifecycle has ended.', 7, 'churned')
ON CONFLICT (code) DO NOTHING;


-- =============================================================================
-- SECTION 2: PRIMARY TABLE (CUSTOMER SCOPE)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.company_strategies (
  strategy_id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id            uuid NOT NULL,
  mission                text NOT NULL DEFAULT '',
  mission_description    text,
  vision                 text NOT NULL DEFAULT '',
  vision_description     text,
  publication_status_id  uuid NOT NULL,
  owner_user_id          uuid,
  is_published           boolean NOT NULL DEFAULT false,
  effective_at           timestamptz,
  created_at             timestamptz NOT NULL DEFAULT now(),
  created_by_user_id     uuid,
  updated_at             timestamptz NOT NULL DEFAULT now(),
  updated_by_user_id     uuid,

  CONSTRAINT company_strategies_customer_id_fkey
    FOREIGN KEY (customer_id) REFERENCES public.customers(customer_id)
    ON DELETE CASCADE,

  CONSTRAINT company_strategies_publication_status_id_fkey
    FOREIGN KEY (publication_status_id) REFERENCES public.option_publication_status(option_id)
    ON DELETE RESTRICT,

  CONSTRAINT company_strategies_owner_user_id_fkey
    FOREIGN KEY (owner_user_id) REFERENCES public.users(user_id)
    ON DELETE SET NULL,

  CONSTRAINT company_strategies_created_by_user_id_fkey
    FOREIGN KEY (created_by_user_id) REFERENCES public.users(user_id)
    ON DELETE SET NULL,

  CONSTRAINT company_strategies_updated_by_user_id_fkey
    FOREIGN KEY (updated_by_user_id) REFERENCES public.users(user_id)
    ON DELETE SET NULL,

  CONSTRAINT company_strategies_customer_unique UNIQUE (customer_id),
  CONSTRAINT company_strategies_mission_length_ck CHECK (char_length(mission) <= 400),
  CONSTRAINT company_strategies_vision_length_ck CHECK (char_length(vision) <= 800)
);

COMMENT ON TABLE public.company_strategies IS
  'Canonical strategy workspace per customer, containing mission, vision, governance, and publication state.';


-- =============================================================================
-- SECTION 3: SECONDARY TABLES (CUSTOMER SCOPE)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.strategy_principles (
  principle_id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id          uuid NOT NULL,
  name                 text NOT NULL DEFAULT '',
  description          text,
  order_index          integer NOT NULL DEFAULT 0,
  is_active            boolean NOT NULL DEFAULT true,
  created_at           timestamptz NOT NULL DEFAULT now(),
  created_by_user_id   uuid,
  updated_at           timestamptz NOT NULL DEFAULT now(),
  updated_by_user_id   uuid,

  CONSTRAINT strategy_principles_strategy_id_fkey
    FOREIGN KEY (strategy_id) REFERENCES public.company_strategies(strategy_id)
    ON DELETE CASCADE,

  CONSTRAINT strategy_principles_created_by_user_id_fkey
    FOREIGN KEY (created_by_user_id) REFERENCES public.users(user_id)
    ON DELETE SET NULL,

  CONSTRAINT strategy_principles_updated_by_user_id_fkey
    FOREIGN KEY (updated_by_user_id) REFERENCES public.users(user_id)
    ON DELETE SET NULL,

  CONSTRAINT strategy_principles_name_length_ck CHECK (char_length(name) <= 120),
  CONSTRAINT strategy_principles_order_index_ck CHECK (order_index >= 0)
);

COMMENT ON TABLE public.strategy_principles IS
  'Ordered collection of strategic principles associated with a company strategy.';


CREATE TABLE IF NOT EXISTS public.strategy_values (
  value_id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id          uuid NOT NULL,
  name                 text NOT NULL DEFAULT '',
  description          text,
  order_index          integer NOT NULL DEFAULT 0,
  is_active            boolean NOT NULL DEFAULT true,
  created_at           timestamptz NOT NULL DEFAULT now(),
  created_by_user_id   uuid,
  updated_at           timestamptz NOT NULL DEFAULT now(),
  updated_by_user_id   uuid,

  CONSTRAINT strategy_values_strategy_id_fkey
    FOREIGN KEY (strategy_id) REFERENCES public.company_strategies(strategy_id)
    ON DELETE CASCADE,

  CONSTRAINT strategy_values_created_by_user_id_fkey
    FOREIGN KEY (created_by_user_id) REFERENCES public.users(user_id)
    ON DELETE SET NULL,

  CONSTRAINT strategy_values_updated_by_user_id_fkey
    FOREIGN KEY (updated_by_user_id) REFERENCES public.users(user_id)
    ON DELETE SET NULL,

  CONSTRAINT strategy_values_name_length_ck CHECK (char_length(name) <= 120),
  CONSTRAINT strategy_values_order_index_ck CHECK (order_index >= 0)
);

COMMENT ON TABLE public.strategy_values IS
  'Ordered company values that shape operating norms for a strategy workspace.';


CREATE TABLE IF NOT EXISTS public.competitors (
  competitor_id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id          uuid NOT NULL,
  name                 text NOT NULL DEFAULT '',
  website_url          text,
  category             text,
  summary              text,
  status_id            uuid NOT NULL,
  source_id            uuid,
  created_at           timestamptz NOT NULL DEFAULT now(),
  created_by_user_id   uuid,
  updated_at           timestamptz NOT NULL DEFAULT now(),
  updated_by_user_id   uuid,

  CONSTRAINT competitors_customer_id_fkey
    FOREIGN KEY (customer_id) REFERENCES public.customers(customer_id)
    ON DELETE CASCADE,

  CONSTRAINT competitors_status_id_fkey
    FOREIGN KEY (status_id) REFERENCES public.option_competitor_status(option_id)
    ON DELETE RESTRICT,

  CONSTRAINT competitors_source_id_fkey
    FOREIGN KEY (source_id) REFERENCES public.option_data_source(option_id)
    ON DELETE SET NULL,

  CONSTRAINT competitors_created_by_user_id_fkey
    FOREIGN KEY (created_by_user_id) REFERENCES public.users(user_id)
    ON DELETE SET NULL,

  CONSTRAINT competitors_updated_by_user_id_fkey
    FOREIGN KEY (updated_by_user_id) REFERENCES public.users(user_id)
    ON DELETE SET NULL,

  CONSTRAINT competitors_name_length_ck CHECK (char_length(name) <= 255),
  CONSTRAINT competitors_website_url_length_ck CHECK (website_url IS NULL OR char_length(website_url) <= 1024),
  CONSTRAINT competitors_category_length_ck CHECK (category IS NULL OR char_length(category) <= 255)
);

COMMENT ON TABLE public.competitors IS
  'Customer-scoped competitor register entries with status and source metadata.';


CREATE TABLE IF NOT EXISTS public.competitor_signals (
  signal_id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_id        uuid NOT NULL,
  signal_type_id       uuid NOT NULL,
  observed_at          timestamptz NOT NULL DEFAULT now(),
  source_url           text,
  note                 text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  created_by_user_id   uuid,
  updated_at           timestamptz NOT NULL DEFAULT now(),
  updated_by_user_id   uuid,

  CONSTRAINT competitor_signals_competitor_id_fkey
    FOREIGN KEY (competitor_id) REFERENCES public.competitors(competitor_id)
    ON DELETE CASCADE,

  CONSTRAINT competitor_signals_signal_type_id_fkey
    FOREIGN KEY (signal_type_id) REFERENCES public.option_competitor_signal_type(option_id)
    ON DELETE RESTRICT,

  CONSTRAINT competitor_signals_created_by_user_id_fkey
    FOREIGN KEY (created_by_user_id) REFERENCES public.users(user_id)
    ON DELETE SET NULL,

  CONSTRAINT competitor_signals_updated_by_user_id_fkey
    FOREIGN KEY (updated_by_user_id) REFERENCES public.users(user_id)
    ON DELETE SET NULL,

  CONSTRAINT competitor_signals_source_url_length_ck CHECK (source_url IS NULL OR char_length(source_url) <= 2048)
);

COMMENT ON TABLE public.competitor_signals IS
  'Events and observations tied to a competitor (pricing changes, launches, funding, etc.).';


CREATE TABLE IF NOT EXISTS public.strategy_change_logs (
  change_log_id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id          uuid NOT NULL,
  change_type_id       uuid NOT NULL,
  changed_by_user_id   uuid NOT NULL,
  changed_at           timestamptz NOT NULL DEFAULT now(),
  summary              text NOT NULL,
  justification        text,
  meta                 jsonb,

  CONSTRAINT strategy_change_logs_strategy_id_fkey
    FOREIGN KEY (strategy_id) REFERENCES public.company_strategies(strategy_id)
    ON DELETE CASCADE,

  CONSTRAINT strategy_change_logs_change_type_id_fkey
    FOREIGN KEY (change_type_id) REFERENCES public.option_strategy_change_type(option_id)
    ON DELETE RESTRICT,

  CONSTRAINT strategy_change_logs_changed_by_user_id_fkey
    FOREIGN KEY (changed_by_user_id) REFERENCES public.users(user_id)
    ON DELETE RESTRICT,

  CONSTRAINT strategy_change_logs_summary_length_ck CHECK (char_length(summary) BETWEEN 1 AND 240)
);

COMMENT ON TABLE public.strategy_change_logs IS
  'Immutable audit trail of edits and publications performed within the strategy workspace.';


-- =============================================================================
-- SECTION 3B: ADDITIONAL STRATEGY FORGE TABLES (CUSTOMER SCOPE)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.personas (
  persona_id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id                       uuid NOT NULL,
  created_by                        uuid NOT NULL,
  updated_by                        uuid NOT NULL,
  name                              text NOT NULL,
  titles                            text NOT NULL,
  department                        text,
  job_responsibilities              text,
  is_manager                        boolean NOT NULL DEFAULT false,
  experience_years                  text,
  education_levels                  text,
  pain_points_html                  text,
  goals_html                        text,
  solution_relevant_pain_points_html text,
  solution_relevant_goals_html     text,
  current_solutions_html            text,
  switching_costs_html              text,
  unsatisfied_with_html             text,
  ideal_outcome_html                text,
  buying_behavior                   text,
  digital_savviness                 text,
  is_decider                        boolean NOT NULL DEFAULT false,
  created_at                        timestamptz NOT NULL DEFAULT now(),
  updated_at                        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT personas_customer_id_fkey
    FOREIGN KEY (customer_id) REFERENCES public.customers(customer_id)
    ON DELETE CASCADE,

  CONSTRAINT personas_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.users(user_id)
    ON DELETE NO ACTION,

  CONSTRAINT personas_updated_by_fkey
    FOREIGN KEY (updated_by) REFERENCES public.users(user_id)
    ON DELETE NO ACTION,

  CONSTRAINT personas_name_ck CHECK (name IS NOT NULL AND length(name) > 0)
);

COMMENT ON TABLE public.personas IS
  'Customer personas for targeting and messaging';


CREATE TABLE IF NOT EXISTS public.segments (
  segment_id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id                       uuid NOT NULL,
  name                              text NOT NULL,
  description                       text NOT NULL,
  code                              text,
  external_id                       text,
  created_by                        uuid,
  updated_by                        uuid,
  created_at                        timestamptz NOT NULL DEFAULT now(),
  updated_at                        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT segments_customer_id_fkey
    FOREIGN KEY (customer_id) REFERENCES public.customers(customer_id)
    ON DELETE CASCADE,

  CONSTRAINT segments_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.users(user_id)
    ON DELETE NO ACTION,

  CONSTRAINT segments_updated_by_fkey
    FOREIGN KEY (updated_by) REFERENCES public.users(user_id)
    ON DELETE NO ACTION,

  CONSTRAINT segments_name_ck CHECK (name IS NOT NULL AND length(name) > 0)
);

COMMENT ON TABLE public.segments IS
  'Market segments or organizational groupings';


-- Journey phase enum for customer journey stages
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'journey_phase_enum') THEN
    CREATE TYPE public.journey_phase_enum AS ENUM (
      'Marketing',
      'Sales',
      'Onboarding',
      'Customer Success'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.customer_journey_stages (
  customer_journey_stage_id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id                       uuid NOT NULL,
  journey_phase                     journey_phase_enum NOT NULL,
  name                              text NOT NULL,
  description                       text NOT NULL,
  graduation_criteria               text NOT NULL,
  order_index                       integer,
  code                              text,
  created_by                        uuid,
  updated_by                        uuid,
  created_at                        timestamptz NOT NULL DEFAULT now(),
  updated_at                        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT customer_journey_stages_customer_id_fkey
    FOREIGN KEY (customer_id) REFERENCES public.customers(customer_id)
    ON DELETE CASCADE,

  CONSTRAINT customer_journey_stages_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.users(user_id)
    ON DELETE NO ACTION,

  CONSTRAINT customer_journey_stages_updated_by_fkey
    FOREIGN KEY (updated_by) REFERENCES public.users(user_id)
    ON DELETE NO ACTION,

  CONSTRAINT customer_journey_stages_name_ck CHECK (name IS NOT NULL AND length(name) > 0)
);

COMMENT ON TABLE public.customer_journey_stages IS
  'Customer journey stages across different phases';


CREATE TABLE IF NOT EXISTS public.customer_journey_stages_singleton (
  customer_journey_stage_singleton_id  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_phase                        journey_phase_enum NOT NULL,
  name                                 text NOT NULL,
  description                          text NOT NULL,
  graduation_criteria                  text NOT NULL,
  order_index                          integer NOT NULL,
  code                                 text NOT NULL,

  CONSTRAINT customer_journey_stages_singleton_name_ck CHECK (name IS NOT NULL AND length(name) > 0),
  CONSTRAINT customer_journey_stages_singleton_code_ck CHECK (code IS NOT NULL AND length(code) > 0),
  CONSTRAINT customer_journey_stages_singleton_unique_code UNIQUE (code),
  CONSTRAINT customer_journey_stages_singleton_unique_phase_order UNIQUE (journey_phase, order_index)
);

COMMENT ON TABLE public.customer_journey_stages_singleton IS
  'System-wide default templates for customer journey stages (editable by system admins only)';


CREATE TABLE IF NOT EXISTS public.customer_info (
  customer_info_id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id                       uuid NOT NULL,
  company_name                      text NOT NULL,
  problem_overview                  text NOT NULL,
  solution_overview                 text NOT NULL,
  one_sentence_summary              text NOT NULL,
  tagline                           text NOT NULL,
  content_authoring_prompt          text,
  created_at                        timestamptz NOT NULL DEFAULT now(),
  updated_at                        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT customer_info_customer_id_fkey
    FOREIGN KEY (customer_id) REFERENCES public.customers(customer_id)
    ON DELETE CASCADE,

  CONSTRAINT customer_info_unique_ck UNIQUE (customer_id)
);

COMMENT ON TABLE public.customer_info IS
  'Company information and messaging';


-- =============================================================================
-- SECTION 4: INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS option_publication_status_programmatic_name_idx
  ON public.option_publication_status (programmatic_name);

CREATE INDEX IF NOT EXISTS option_competitor_status_programmatic_name_idx
  ON public.option_competitor_status (programmatic_name);

CREATE INDEX IF NOT EXISTS option_competitor_signal_type_programmatic_name_idx
  ON public.option_competitor_signal_type (programmatic_name);

CREATE INDEX IF NOT EXISTS option_data_source_programmatic_name_idx
  ON public.option_data_source (programmatic_name);

CREATE INDEX IF NOT EXISTS option_strategy_change_type_programmatic_name_idx
  ON public.option_strategy_change_type (programmatic_name);

CREATE INDEX IF NOT EXISTS company_strategies_customer_id_idx
  ON public.company_strategies (customer_id);

CREATE INDEX IF NOT EXISTS company_strategies_publication_status_id_idx
  ON public.company_strategies (publication_status_id);

CREATE INDEX IF NOT EXISTS company_strategies_owner_user_id_idx
  ON public.company_strategies (owner_user_id);

CREATE INDEX IF NOT EXISTS strategy_principles_strategy_id_idx
  ON public.strategy_principles (strategy_id, order_index);

CREATE INDEX IF NOT EXISTS strategy_values_strategy_id_idx
  ON public.strategy_values (strategy_id, order_index);

CREATE INDEX IF NOT EXISTS competitors_customer_id_idx
  ON public.competitors (customer_id);

CREATE INDEX IF NOT EXISTS competitors_status_id_idx
  ON public.competitors (status_id);

CREATE INDEX IF NOT EXISTS competitors_name_lower_idx
  ON public.competitors (lower(name));

CREATE INDEX IF NOT EXISTS competitor_signals_competitor_id_idx
  ON public.competitor_signals (competitor_id);

CREATE INDEX IF NOT EXISTS competitor_signals_type_observed_idx
  ON public.competitor_signals (signal_type_id, observed_at DESC);

CREATE INDEX IF NOT EXISTS strategy_change_logs_strategy_id_idx
  ON public.strategy_change_logs (strategy_id, changed_at DESC);

CREATE INDEX IF NOT EXISTS strategy_change_logs_change_type_id_idx
  ON public.strategy_change_logs (change_type_id);

CREATE INDEX IF NOT EXISTS personas_customer_id_idx
  ON public.personas (customer_id);

CREATE INDEX IF NOT EXISTS segments_customer_id_idx
  ON public.segments (customer_id);

CREATE INDEX IF NOT EXISTS customer_journey_stages_customer_id_idx
  ON public.customer_journey_stages (customer_id);

CREATE INDEX IF NOT EXISTS customer_journey_stages_journey_phase_idx
  ON public.customer_journey_stages (journey_phase, order_index);

CREATE INDEX IF NOT EXISTS customer_journey_stages_singleton_journey_phase_idx
  ON public.customer_journey_stages_singleton (journey_phase, order_index);

CREATE INDEX IF NOT EXISTS customer_journey_stages_singleton_code_idx
  ON public.customer_journey_stages_singleton (code);

CREATE INDEX IF NOT EXISTS customer_info_customer_id_idx
  ON public.customer_info (customer_id);


-- =============================================================================
-- SECTION 5: TRIGGERS
-- =============================================================================

CREATE OR REPLACE FUNCTION public.trg_update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_company_strategies_updated_at ON public.company_strategies;
CREATE TRIGGER trg_company_strategies_updated_at
  BEFORE UPDATE ON public.company_strategies
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_update_updated_at();

DROP TRIGGER IF EXISTS trg_strategy_principles_updated_at ON public.strategy_principles;
CREATE TRIGGER trg_strategy_principles_updated_at
  BEFORE UPDATE ON public.strategy_principles
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_update_updated_at();

DROP TRIGGER IF EXISTS trg_strategy_values_updated_at ON public.strategy_values;
CREATE TRIGGER trg_strategy_values_updated_at
  BEFORE UPDATE ON public.strategy_values
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_update_updated_at();

DROP TRIGGER IF EXISTS trg_competitors_updated_at ON public.competitors;
CREATE TRIGGER trg_competitors_updated_at
  BEFORE UPDATE ON public.competitors
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_update_updated_at();

DROP TRIGGER IF EXISTS trg_competitor_signals_updated_at ON public.competitor_signals;
CREATE TRIGGER trg_competitor_signals_updated_at
  BEFORE UPDATE ON public.competitor_signals
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_update_updated_at();

DROP TRIGGER IF EXISTS trg_personas_updated_at ON public.personas;
CREATE TRIGGER trg_personas_updated_at
  BEFORE UPDATE ON public.personas
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_update_updated_at();

DROP TRIGGER IF EXISTS trg_segments_updated_at ON public.segments;
CREATE TRIGGER trg_segments_updated_at
  BEFORE UPDATE ON public.segments
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_update_updated_at();

DROP TRIGGER IF EXISTS trg_customer_journey_stages_updated_at ON public.customer_journey_stages;
CREATE TRIGGER trg_customer_journey_stages_updated_at
  BEFORE UPDATE ON public.customer_journey_stages
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_update_updated_at();

DROP TRIGGER IF EXISTS trg_customer_info_updated_at ON public.customer_info;
CREATE TRIGGER trg_customer_info_updated_at
  BEFORE UPDATE ON public.customer_info
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_update_updated_at();

