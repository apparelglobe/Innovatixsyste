/**
 * Resources articles. Evergreen, honest thought-leadership grounded in how we
 * actually build — no fabricated data or client claims. Each article is a data
 * object rendered by app/resources/[slug]/page.tsx. Add an entry to publish.
 */
export type Article = {
  slug: string;
  title: string; // <title> and H1
  description: string; // meta description + list blurb
  date: string; // ISO, display + JSON-LD
  readMinutes: number;
  intro: string[];
  sections: { heading: string; body: string[]; bullets?: string[] }[];
  internalLinks: { label: string; href: string }[];
};

export const ARTICLES: Record<string, Article> = {
  'is-custom-software-worth-it': {
    slug: 'is-custom-software-worth-it',
    title: 'How to Tell When Custom Software Is Actually Worth It',
    description:
      'Custom software is not always the right call. A practical framework for deciding when to build, when to buy, and how to avoid the expensive mistake of doing either by default.',
    date: '2026-07-18',
    readMinutes: 6,
    intro: [
      'The honest answer to "should we build custom software?" is: sometimes. Building when you should have bought wastes money and time; buying when you should have built quietly caps how well your business can run. The trick is knowing which situation you are in — and most teams decide by default rather than on the merits.',
      'Here is the framework we use with clients, including the cases where we tell people not to build.',
    ],
    sections: [
      {
        heading: 'Buy when the process is a commodity',
        body: [
          'If a process works the same way at thousands of companies — email, accounting, payroll, general CRM — a packaged product has already solved it better and cheaper than you can. Building your own is almost always a mistake here. The market has amortized the cost across every customer; you would be paying full price to reinvent it.',
          'The tell: if you cannot describe how your version of the process is a competitive advantage, it is a commodity. Buy it.',
        ],
      },
      {
        heading: 'Build when the software IS the operation',
        body: [
          'The opposite is true when the software encodes how your business actually competes — the specific way you take orders across channels, manage inventory, price, fulfill, and reconcile. Packaged tools force you to bend your operation to their model, and the gaps get filled by people copying data between systems. That manual glue becomes the ceiling on how fast you can grow.',
          'When the process is your edge, custom software is what lets you run it as one connected system instead of a patchwork. This is the case where building pays for itself, often many times over.',
        ],
      },
      {
        heading: 'The hidden cost of "buy" is integration',
        body: [
          'Buying rarely means buying one thing. It means buying five things that were never designed to talk to each other, and then paying — in salaries and errors — for the humans who move data between them. When people evaluate build-vs-buy, they compare the license cost of the tool to the build cost of custom software and forget the ongoing operational tax of the gaps.',
          'A useful exercise: add up the hours your team spends re-keying and reconciling between systems each week, and annualize it. That number is often larger than anyone expects, and it does not shrink as you grow — it grows with you.',
        ],
      },
      {
        heading: 'A simple decision test',
        body: ['Run the candidate process through four questions:'],
        bullets: [
          'Is this process a source of competitive advantage, or a commodity? (Advantage → lean build; commodity → lean buy.)',
          'Does an off-the-shelf tool fit without heavy customization? (Heavy customization erodes the "buy" savings fast.)',
          'How much manual work sits in the gaps between our current tools? (High → integration or a platform pays off.)',
          'Will this need to scale or change in ways a packaged product will not follow? (Yes → build for control.)',
        ],
      },
      {
        heading: 'The pragmatic answer is usually a mix',
        body: [
          'The best architecture is rarely all-custom or all-bought. Buy the commodities (email, accounting, payments), build the parts that are your operation, and invest in the integration that makes them behave as one system. We recommend build-vs-buy honestly per capability — custom where it creates advantage, proven tools where it does not — because our incentive is a system that works, not a bigger build.',
        ],
      },
    ],
    internalLinks: [
      { label: 'Custom Software Development', href: '/services/software-engineering/custom-software-development' },
      { label: 'Business Operations Platforms', href: '/services/enterprise-systems/business-operations-platforms' },
      { label: 'Digital Strategy', href: '/services/digital-transformation/digital-strategy' },
    ],
  },

  'grounding-ai-in-your-data-rag': {
    slug: 'grounding-ai-in-your-data-rag',
    title: 'Grounding AI in Your Own Data: Why RAG Beats a Chatbot Bolt-On',
    description:
      'The difference between an AI feature that helps and one that confidently misleads is grounding. A plain-English explanation of retrieval-augmented generation and why it matters.',
    date: '2026-07-18',
    readMinutes: 7,
    intro: [
      'Most disappointing AI features fail the same way: they answer confidently, and they are wrong. The model has never seen your policies, your product data, or your history, so when asked about them it does what language models do — it produces something plausible. Plausible and correct are not the same thing, and in a business context the gap is expensive.',
      'The fix is not a smarter model. It is grounding: making the AI answer from your actual information instead of guessing. The main technique for that is retrieval-augmented generation, or RAG.',
    ],
    sections: [
      {
        heading: 'What RAG actually does',
        body: [
          'RAG adds a step before the model answers. When a question comes in, the system first retrieves the most relevant pieces of your own content — documents, records, tickets, product data — and hands them to the model along with the question. The model is then instructed to answer only from that retrieved material, and to cite it.',
          'The effect is that the AI now answers about your business from your facts, with sources you can check, and can honestly say "I do not know" when nothing relevant is found — instead of inventing.',
        ],
      },
      {
        heading: 'Why not just fine-tune a model?',
        body: [
          'Fine-tuning bakes information into the model’s weights. That is the wrong tool for knowledge you update: every change means retraining, you cannot easily enforce who is allowed to see what, and you lose the ability to cite a source. RAG keeps your knowledge in your systems where it stays current and access-controlled, and the model reads it at answer time.',
          'Fine-tuning has a place — for teaching a model a particular style or a narrow, stable task — but for "answer questions about our ever-changing business," retrieval is almost always the right first choice.',
        ],
      },
      {
        heading: 'The hard part is retrieval, not the model',
        body: [
          'Teams assume the model is where the quality lives. In practice, most RAG failures are retrieval failures: the system fetched the wrong context, so the answer was wrong no matter how capable the model. Getting retrieval right — how you chunk documents, how you search, how you rank — is the real engineering, and it is where a working system diverges from a demo.',
          'This is also why "we plugged in an AI chatbot" so often disappoints. Without quality retrieval over your content, the bot is just a general model with a text box, and it will confidently answer questions it has no basis to answer.',
        ],
      },
      {
        heading: 'Grounding is also how you stay safe',
        body: [
          'Grounding is not only about accuracy — it is about control. Because RAG answers from retrieved content, you can enforce access control on that content, so a user only ever gets answers grounded in documents they are allowed to see. And because answers cite sources, a person can verify anything consequential before acting on it. Our rule is simple: no source, no claim.',
        ],
      },
      {
        heading: 'The takeaway',
        body: [
          'AI becomes genuinely useful in a business when it is grounded in that business’s real data, guarded against overconfidence, and wired into the workflow where people work. A model alone is a party trick; a grounded, cited, access-controlled assistant is a tool people trust. If an AI vendor cannot tell you how their system grounds answers and cites sources, that is the question to keep asking.',
        ],
      },
    ],
    internalLinks: [
      { label: 'Retrieval-Augmented Generation', href: '/services/ai-services/rag' },
      { label: 'AI Chatbots & Assistants', href: '/services/ai-services/chatbots-assistants' },
      { label: 'AI Strategy & Consulting', href: '/services/ai-services/ai-strategy-consulting' },
    ],
  },

  'modernize-legacy-without-big-bang': {
    slug: 'modernize-legacy-without-big-bang',
    title: 'Modernizing Legacy Systems Without a Big-Bang Cutover',
    description:
      'Big-bang rewrites are how modernization projects fail. A safer, incremental approach — the strangler-fig pattern — that keeps the business running the whole way.',
    date: '2026-07-18',
    readMinutes: 6,
    intro: [
      'Ask anyone who has lived through a "we will rebuild the whole system and switch over one weekend" project, and you will hear the same story: it slipped, it was terrifying, and the cutover was a night no one wants to repeat. Big-bang rewrites concentrate all the risk into a single moment where everything must work perfectly. That is a bet businesses regularly lose.',
      'There is a calmer way to modernize a legacy system — one that never asks the business to hold its breath.',
    ],
    sections: [
      {
        heading: 'Understand before you replace',
        body: [
          'Legacy systems are dangerous mostly because they are not understood. Business rules live in old code that no one fully remembers, and undocumented behavior turns every change into a gamble. So the first step is not writing new code — it is making the current system legible: what it does, what data it holds, what it integrates with, and which of its behaviors actually matter.',
          'Skipping this is how modernization projects "finish" and then quietly break something the old system handled that nobody knew about.',
        ],
      },
      {
        heading: 'The strangler-fig pattern',
        body: [
          'The safer approach borrows its name from a vine that grows around a tree and gradually replaces it. You put a stable interface in front of the legacy system, then replace it one capability at a time behind that interface. Each piece you move is small, verifiable, and reversible. The old system keeps running the parts you have not migrated yet, so the business never stops.',
          'Over time, more and more of the work flows to the new implementation, until the legacy system is doing nothing and can be retired — without a single dramatic cutover.',
        ],
      },
      {
        heading: 'Data migration is where projects die',
        body: [
          'The step teams underestimate most is data. Years of accumulated, inconsistent data rarely map cleanly to a new model, and a botched migration is how you lose trust — or records. The discipline that prevents disaster is boring and non-negotiable: profile the data, clean it, migrate into a fresh target (never overwrite the source blind), and reconcile the result against the original before anyone trusts it.',
          'Treat data migration as a first-class part of the project with its own plan and verification, not an afterthought bolted onto the end.',
        ],
      },
      {
        heading: 'Keep a rollback at every step',
        body: [
          'Because each increment is small and reversible, a problem is a quick step back rather than an emergency. That property — the ability to undo any single change safely — is what turns modernization from a high-stakes gamble into routine engineering. It is also what lets the business keep operating throughout, which is the entire point.',
        ],
      },
      {
        heading: 'For a whole estate, sequence by value and risk',
        body: [
          'When "the legacy system" is really a tangle of aging applications, the engineering approach above still applies per system — but the program-level question becomes what to modernize first. Sequence by the value at stake and the risk of change, so early moves reduce the most risk or unlock the most value and keep the effort funded. Modernizing the wrong thing first is how budgets get spent with nothing to show.',
        ],
      },
    ],
    internalLinks: [
      { label: 'Legacy Software Modernization', href: '/services/software-engineering/legacy-modernization' },
      { label: 'Legacy System Modernization Program', href: '/services/digital-transformation/legacy-modernization' },
      { label: 'Architecture Assessments', href: '/services/digital-transformation/architecture-assessments' },
    ],
  },
};

/** Articles newest-first for listing. Static order (no Date.now at build). */
export const articleList = (): Article[] =>
  Object.values(ARTICLES).sort((a, b) => (a.date < b.date ? 1 : -1));

export const getArticle = (slug: string): Article | undefined => ARTICLES[slug];
export const articleSlugs = (): string[] => Object.keys(ARTICLES);
