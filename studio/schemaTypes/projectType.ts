import {defineType, defineField, defineArrayMember} from 'sanity'

export const projectChallengeType = defineType({
  name: 'projectChallenge',
  title: 'Key Challenge & Trade-off',
  type: 'object',
  fields: [
    defineField({
      name: 'title',
      title: 'Challenge Title',
      type: 'string',
      description: 'e.g. Real-Time Inference at Scale, Zero-Knowledge Key Derivation',
      validation: (R) => R.required(),
    }),
    defineField({
      name: 'roadblock',
      title: 'The Roadblock',
      type: 'text',
      rows: 3,
      description: 'What obstacle or technical roadblock did you encounter?',
      validation: (R) => R.required(),
    }),
    defineField({
      name: 'tradeoff',
      title: 'Solution & Trade-offs',
      type: 'text',
      rows: 3,
      description: 'What compromise or architectural decision was made to resolve it?',
      validation: (R) => R.required(),
    }),
  ],
  preview: {
    select: {title: 'title', subtitle: 'roadblock'},
  },
})

export const projectMetricType = defineType({
  name: 'projectMetric',
  title: 'Result / Impact Metric',
  type: 'object',
  fields: [
    defineField({
      name: 'value',
      title: 'Metric Value',
      type: 'string',
      description: 'e.g. "-45%", "10k+", "< 50ms", "99.9%"',
      validation: (R) => R.required(),
    }),
    defineField({
      name: 'label',
      title: 'Metric Label',
      type: 'string',
      description: 'e.g. "Latency Reduction", "Active Users", "API Response Time"',
      validation: (R) => R.required(),
    }),
    defineField({
      name: 'description',
      title: 'Context / Note (Optional)',
      type: 'string',
      description: 'e.g. "Benchmarked on NVIDIA T4 via TensorRT"',
    }),
  ],
  preview: {
    select: {title: 'value', subtitle: 'label'},
  },
})

export const projectType = defineType({
  name: 'project',
  title: 'Project',
  type: 'document',
  fields: [
    // ── 1. Header & Summary ──
    defineField({
      name: 'title',
      title: 'Project Title',
      type: 'string',
      validation: (R) => R.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {source: 'title', maxLength: 96},
      validation: (R) => R.required(),
    }),
    defineField({
      name: 'tagline',
      title: 'One-Sentence Elevator Pitch',
      type: 'string',
      description: 'Hooks the reviewer within 5 seconds. Used as subtitle and in project list.',
      validation: (R) => R.required(),
    }),
    defineField({
      name: 'year',
      title: 'Year',
      type: 'string',
      description: 'e.g. "2025"',
      initialValue: '2025',
      validation: (R) => R.required(),
    }),
    defineField({
      name: 'order',
      title: 'Display Order',
      type: 'number',
      description: 'Lower number appears first (e.g. 1, 2, 3...)',
      initialValue: 1,
    }),
    defineField({
      name: 'coverImage',
      title: 'Primary Visual or Demo GIF',
      type: 'image',
      description: 'High quality screenshot, demo GIF, or teaser visual',
      options: {hotspot: true},
      fields: [
        defineField({
          name: 'alt',
          title: 'Alt text',
          type: 'string',
        }),
      ],
      validation: (R) => R.required(),
    }),

    // ── 2. Metadata at a Glance ──
    defineField({
      name: 'role',
      title: 'Role',
      type: 'string',
      description: 'e.g. "Lead ML Engineer", "Full-Stack Developer"',
      validation: (R) => R.required(),
    }),
    defineField({
      name: 'timeline',
      title: 'Timeline',
      type: 'string',
      description: 'e.g. "3 months (Jan – Mar 2025)"',
      validation: (R) => R.required(),
    }),
    defineField({
      name: 'teamSize',
      title: 'Team Size',
      type: 'string',
      description: 'e.g. "Solo project", "4 engineers, 1 designer"',
      validation: (R) => R.required(),
    }),
    defineField({
      name: 'techStack',
      title: 'Core Tech Stack / Tools',
      type: 'array',
      of: [defineArrayMember({type: 'string'})],
      options: {layout: 'tags'},
      description: 'e.g. Python, PyTorch, Next.js, TypeScript, Docker, FastAPI',
      validation: (R) => R.required().min(1),
    }),

    // ── 3. The Problem & Objective ──
    defineField({
      name: 'problem',
      title: 'The Problem',
      type: 'text',
      rows: 4,
      description: 'What specific problem or pain point were you solving?',
      validation: (R) => R.required(),
    }),
    defineField({
      name: 'targetUser',
      title: 'Target User',
      type: 'string',
      description: 'Who was the user or target audience? (e.g. ML researchers, smallholder farmers, healthcare workers)',
      validation: (R) => R.required(),
    }),
    defineField({
      name: 'goal',
      title: 'The Objective & Goal',
      type: 'text',
      rows: 4,
      description: 'What was the defined success criteria or goal?',
      validation: (R) => R.required(),
    }),

    // ── 4. Your Direct Contribution ──
    defineField({
      name: 'directContribution',
      title: 'Your Direct Contribution',
      type: 'array',
      of: [defineArrayMember({type: 'string'})],
      description: 'Bullet points detailing your exact ownership vs. team contributions (e.g. "Architected the zero-knowledge encryption protocol", "Trained and fine-tuned the model")',
      validation: (R) => R.required().min(1),
    }),

    // ── 5. Process & Architecture ──
    defineField({
      name: 'processArchitecture',
      title: 'Process & Architecture',
      type: 'array',
      description: 'System design diagrams, technical decisions, workflow steps, and code snippets.',
      of: [
        defineArrayMember({
          type: 'block',
          styles: [
            {title: 'Normal', value: 'normal'},
            {title: 'Heading 2', value: 'h2'},
            {title: 'Heading 3', value: 'h3'},
            {title: 'Quote', value: 'blockquote'},
          ],
          marks: {
            decorators: [
              {title: 'Strong', value: 'strong'},
              {title: 'Emphasis', value: 'em'},
              {title: 'Code', value: 'code'},
            ],
            annotations: [
              defineArrayMember({
                type: 'object',
                name: 'link',
                title: 'Link',
                fields: [
                  defineField({
                    name: 'href',
                    type: 'url',
                    title: 'URL',
                    validation: (R) =>
                      R.uri({allowRelative: true, scheme: ['http', 'https', 'mailto']}),
                  }),
                ],
              }),
            ],
          },
        }),
        defineArrayMember({
          type: 'image',
          title: 'Architecture Diagram / Wireframe',
          options: {hotspot: true},
          fields: [
            defineField({
              name: 'alt',
              type: 'string',
              title: 'Alt text',
            }),
            defineField({
              name: 'caption',
              type: 'string',
              title: 'Caption',
            }),
          ],
        }),
        defineArrayMember({
          type: 'object',
          name: 'codeBlock',
          title: 'Code Block',
          fields: [
            defineField({
              name: 'language',
              title: 'Language',
              type: 'string',
              options: {
                list: [
                  {title: 'Python', value: 'python'},
                  {title: 'TypeScript / TSX', value: 'tsx'},
                  {title: 'JavaScript / JSX', value: 'jsx'},
                  {title: 'Rust', value: 'rust'},
                  {title: 'Go', value: 'go'},
                  {title: 'C / C++', value: 'c'},
                  {title: 'Bash / Shell', value: 'bash'},
                  {title: 'JSON', value: 'json'},
                  {title: 'Plain text', value: 'code'},
                ],
              },
              initialValue: 'python',
            }),
            defineField({
              name: 'code',
              title: 'Code',
              type: 'text',
              rows: 10,
            }),
            defineField({
              name: 'caption',
              title: 'File name / Description',
              type: 'string',
              description: 'e.g. "engine/inference.py" or "Core tokenization pipeline"',
            }),
          ],
          preview: {
            select: {language: 'language', caption: 'caption', code: 'code'},
            prepare({language, caption, code}: {language?: string; caption?: string; code?: string}) {
              return {
                title: caption || `[${language || 'code'}]`,
                subtitle: (code || '').substring(0, 60),
              }
            },
          },
        }),
      ],
    }),

    // ── 6. Key Challenges & Trade-offs ──
    defineField({
      name: 'challenges',
      title: 'Key Challenges & Trade-offs',
      type: 'array',
      of: [defineArrayMember({type: 'projectChallenge'})],
      description: '1–2 major roadblocks faced and compromises made.',
    }),

    // ── 7. Results & Impact ──
    defineField({
      name: 'metrics',
      title: 'Impact Metrics (Quantitative)',
      type: 'array',
      of: [defineArrayMember({type: 'projectMetric'})],
      description: 'Highlight cards displaying key numbers (e.g. latency, adoption, throughput).',
    }),
    defineField({
      name: 'impactSummary',
      title: 'Qualitative Impact & Results',
      type: 'text',
      rows: 4,
      description: 'Business value, user reception, qualitative feedback, or long-term outcomes.',
    }),

    // ── 8. Artifacts & Links ──
    defineField({
      name: 'liveDemoUrl',
      title: 'Live Demo Link',
      type: 'url',
    }),
    defineField({
      name: 'githubUrl',
      title: 'GitHub Repository',
      type: 'url',
    }),
    defineField({
      name: 'docsUrl',
      title: 'Documentation Link',
      type: 'url',
    }),
    defineField({
      name: 'designSpecsUrl',
      title: 'Design Specs / Whitepaper URL',
      type: 'url',
    }),
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'tagline',
      media: 'coverImage',
    },
  },
})
