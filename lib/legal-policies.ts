export type PolicySection = {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
};

export type LegalPolicy = {
  slug: string;
  title: string;
  summary: string;
  audience: string;
  sections: PolicySection[];
};

export const policyEffectiveDate = "24 July 2026";
export const policyContactEmail = "privacy@empowernotes.org";

export const legalPolicies: LegalPolicy[] = [
  {
    slug: "privacy",
    title: "Privacy Policy",
    summary: "How EmpowerNotes collects, uses, protects and discloses personal information.",
    audience: "Customers, users, participants and website visitors",
    sections: [
      {
        heading: "Our approach",
        paragraphs: [
          "EmpowerNotes is designed for Australian disability, community and care-service organisations. We treat participant, staff and health-related information as sensitive and apply privacy-by-design principles.",
          "This policy describes EmpowerNotes' practices as a software provider. Each customer remains responsible for its own privacy notices, consents and lawful use of the platform."
        ]
      },
      {
        heading: "Information we handle",
        bullets: [
          "Account and contact information, including names, work email addresses, telephone numbers and organisation details.",
          "Customer content, including client profiles, progress notes, incident reports, documents, support information, rosters and billing records.",
          "Security and technical information, including authentication events, device information, IP addresses and audit logs.",
          "Subscription, payment status and service-support communications."
        ]
      },
      {
        heading: "Why we use information",
        bullets: [
          "Provide, secure, support and improve EmpowerNotes.",
          "Authenticate users, enforce roles and keep organisations separated.",
          "Process customer-requested AI assistance and document extraction.",
          "Manage subscriptions, service communications, support and legal obligations.",
          "Detect misuse, investigate incidents and maintain service reliability."
        ]
      },
      {
        heading: "AI and service providers",
        paragraphs: [
          "When a user requests an AI-assisted feature, relevant content may be sent to an approved AI service provider for that request. EmpowerNotes does not authorise customer content to be used to train general-purpose models unless this is expressly agreed.",
          "We use contracted infrastructure, authentication, payment, email and AI providers. Our Subprocessor Register identifies their purpose. Some processing may occur outside Australia, subject to contractual and security safeguards."
        ]
      },
      {
        heading: "Access, correction and complaints",
        paragraphs: [
          `Individuals may request access to or correction of personal information, or raise a privacy concern, by contacting ${policyContactEmail}. We may need to coordinate with the relevant customer organisation where it controls the record.`,
          "We assess eligible data breaches under the Privacy Act 1988 and the Notifiable Data Breaches scheme."
        ]
      }
    ]
  },
  {
    slug: "terms",
    title: "Terms of Service",
    summary: "The rules applying to trials, subscriptions and use of EmpowerNotes.",
    audience: "Customer organisations, owners and authorised users",
    sections: [
      {
        heading: "Service",
        paragraphs: [
          "EmpowerNotes provides documentation, workflow, reporting and administration tools. It does not provide clinical, legal, financial or NDIS compliance advice and does not replace professional judgement.",
          "The customer is responsible for deciding what information is entered, confirming AI-assisted output, configuring user access and meeting its legal and regulatory obligations."
        ]
      },
      {
        heading: "Accounts and authorised use",
        bullets: [
          "Users must provide accurate account information and keep credentials confidential.",
          "Customers must promptly remove access when a worker no longer requires it.",
          "The service must not be used unlawfully, to harm another person, or to upload content without authority.",
          "Customers must not attempt to bypass security, organisation separation, usage limits or subscription controls."
        ]
      },
      {
        heading: "Trials, subscriptions and cancellation",
        paragraphs: [
          "Trial length, included features and subscription pricing are shown during signup. Paid subscriptions renew according to the selected billing cycle until cancelled.",
          "Customers may cancel through the available account or billing process. Cancellation does not remove rights that cannot lawfully be excluded under Australian Consumer Law."
        ]
      },
      {
        heading: "Customer content and exports",
        paragraphs: [
          "Customers retain ownership of their content and grant EmpowerNotes the limited rights needed to operate, secure and support the service.",
          "Customers should export required records before account closure. Retention and deletion follow the Data Retention and Deletion Policy."
        ]
      },
      {
        heading: "Availability and liability",
        paragraphs: [
          "We use reasonable care to provide a secure and reliable service, but no online service is uninterrupted. Planned maintenance, third-party outages and events outside reasonable control may affect availability.",
          "Nothing in these terms excludes consumer guarantees or other rights that cannot lawfully be excluded."
        ]
      }
    ]
  },
  {
    slug: "data-processing",
    title: "Data Processing Terms",
    summary: "How EmpowerNotes processes customer-controlled personal information.",
    audience: "Customer organisations and privacy decision-makers",
    sections: [
      {
        heading: "Roles and instructions",
        paragraphs: [
          "For customer content, the customer determines the purposes and authorised use of personal information. EmpowerNotes processes that information to provide the contracted service and on documented customer instructions.",
          "EmpowerNotes will not sell customer content or use it for unrelated advertising."
        ]
      },
      {
        heading: "Processing commitments",
        bullets: [
          "Maintain confidentiality obligations for personnel with authorised access.",
          "Apply technical and organisational security controls appropriate to the risk.",
          "Use subprocessors under written obligations and remain responsible for their contracted processing.",
          "Assist customers with reasonable privacy requests, security investigations and regulatory enquiries.",
          "Return or delete customer content at the end of service, subject to lawful retention and backup cycles."
        ]
      },
      {
        heading: "Cross-border processing",
        paragraphs: [
          "Some subprocessors may process data outside Australia. Customers should assess whether their use and participant notices permit those disclosures. EmpowerNotes will provide available information about relevant processing locations and safeguards."
        ]
      }
    ]
  },
  {
    slug: "security",
    title: "Security and Access Policy",
    summary: "The safeguards used to protect organisations, users and records.",
    audience: "Customers, security reviewers and EmpowerNotes personnel",
    sections: [
      {
        heading: "Core controls",
        bullets: [
          "Organisation-level data separation enforced in the database.",
          "Role-based access and least-privilege permissions.",
          "Multi-factor authentication for privileged access.",
          "Encryption in transit and security controls provided by contracted hosting services.",
          "Private server-side handling of service credentials and API keys.",
          "Audit logging, monitoring and investigation of suspicious activity."
        ]
      },
      {
        heading: "Customer responsibilities",
        bullets: [
          "Assign the minimum access needed for each worker.",
          "Use individual accounts and do not share credentials.",
          "Review staff, house and participant assignments regularly.",
          "Remove or suspend access promptly when responsibilities change.",
          "Report suspected compromise without delay."
        ]
      },
      {
        heading: "Privileged and developer access",
        paragraphs: [
          "Administrative and developer access is restricted, logged and used only for authorised support, security, maintenance or legal purposes. Production access should require strong authentication and be reviewed regularly."
        ]
      }
    ]
  },
  {
    slug: "ai-use",
    title: "AI Use and Human Review Policy",
    summary: "Boundaries for safe, transparent AI-assisted documentation.",
    audience: "Customers, workers, managers and participants",
    sections: [
      {
        heading: "What AI may do",
        bullets: [
          "Rephrase user-entered notes for clarity, objectivity and person-centred language.",
          "Suggest missing details, structure or possible goal links.",
          "Extract draft information from uploaded documents for human review.",
          "Support reporting summaries based on records the authorised user can access."
        ]
      },
      {
        heading: "What AI must not do",
        bullets: [
          "Invent events, observations, injuries, clinical facts, consent or notifications.",
          "Make clinical diagnoses, legal findings or final reportability decisions.",
          "Approve records or replace worker and manager accountability.",
          "Use customer content to train general-purpose models without express authority."
        ]
      },
      {
        heading: "Human review",
        paragraphs: [
          "The user must review every AI-assisted output against the original facts before saving or submitting it. Material decisions, incident escalation and clinical actions remain human responsibilities.",
          "Customers should tell relevant people when AI processing of their information is used and ensure their privacy notices and consents are appropriate."
        ]
      }
    ]
  },
  {
    slug: "retention",
    title: "Data Retention and Deletion Policy",
    summary: "How records are retained, exported and removed.",
    audience: "Customer administrators and privacy decision-makers",
    sections: [
      {
        heading: "Customer-configured retention",
        paragraphs: [
          "Customers are responsible for setting retention periods that meet their service, funding, employment, safeguarding and legal obligations. EmpowerNotes should not be treated as the customer's only backup or statutory archive."
        ]
      },
      {
        heading: "Account closure",
        bullets: [
          "Customers should export required records before cancellation or closure.",
          "Active application data will be scheduled for deletion after the agreed closure period.",
          "Backups may retain encrypted copies for a limited recovery cycle before automatic expiry.",
          "Security, billing and legal records may be retained where reasonably required by law or legitimate business obligations."
        ]
      },
      {
        heading: "Deletion requests",
        paragraphs: [
          `Authorised account owners may request deletion through ${policyContactEmail}. We verify authority and consider legal holds, active disputes, safety obligations and customer-controller responsibilities before deletion.`
        ]
      }
    ]
  },
  {
    slug: "breach-response",
    title: "Data Breach Response Guide",
    summary: "How suspected security and privacy incidents are handled.",
    audience: "EmpowerNotes personnel and customer administrators",
    sections: [
      {
        heading: "Response stages",
        bullets: [
          "Identify and contain the suspected incident.",
          "Preserve evidence and record decisions, times, systems and affected data.",
          "Assess likely harm, affected organisations and whether personal information was exposed.",
          "Notify affected customers promptly and coordinate required communications.",
          "Assess notification obligations under the Notifiable Data Breaches scheme and other applicable requirements.",
          "Recover services, monitor for recurrence and complete a documented lessons-learned review."
        ]
      },
      {
        heading: "Customer reporting",
        paragraphs: [
          `Customers should report suspected compromise immediately through ${policyContactEmail} and include the affected account, approximate time, observed behaviour and a safe callback contact. Sensitive records should not be emailed unless specifically requested through a secure channel.`
        ]
      }
    ]
  },
  {
    slug: "subprocessors",
    title: "Subprocessor Register",
    summary: "Third-party services supporting delivery of EmpowerNotes.",
    audience: "Customers, procurement teams and privacy reviewers",
    sections: [
      {
        heading: "Current service providers",
        bullets: [
          "Vercel: web application hosting, deployment and delivery.",
          "Supabase: authentication, database, storage and organisation-scoped application data.",
          "OpenAI: customer-requested AI-assisted rewriting and extraction.",
          "Stripe: subscription and payment processing.",
          "Resend: transactional account and staff-invitation email."
        ]
      },
      {
        heading: "Changes and assessment",
        paragraphs: [
          "EmpowerNotes assesses subprocessors for purpose, access, security and contractual protections. This register will be updated when a material provider is added or its processing purpose changes.",
          "Exact processing and hosting locations can depend on the selected service configuration. Customers may request current available details before using EmpowerNotes with live sensitive information."
        ]
      }
    ]
  }
];

export function getLegalPolicy(slug: string) {
  return legalPolicies.find((policy) => policy.slug === slug);
}
