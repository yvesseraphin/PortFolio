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
    }),
    defineField({
      name: 'roadblock',
      title: 'The Roadblock',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'tradeoff',
      title: 'Solution & Trade-offs',
      type: 'text',
      rows: 3,
    }),
  ],
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
    }),
    defineField({
      name: 'label',
      title: 'Metric Label',
      type: 'string',
    }),
    defineField({
      name: 'description',
      title: 'Context / Note (Optional)',
      type: 'string',
    }),
  ],
})

export const projectType = defineType({
  name: 'project',
  title: 'Project',
  type: 'document',
  fields: [
    // ── Essential Metadata ──
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
      title: 'Subtitle / Tagline',
      type: 'string',
      description: 'Short 1-line elevator pitch for the project list (keep under 50-60 characters for best look)',
      validation: (R) => R.required(),
    }),
    defineField({
      name: 'projectType',
      title: 'Project Type / Category',
      type: 'string',
      description: 'e.g. "Machine Learning & AI", "Full-Stack Web App", "Open-Source Tool"',
    }),
    defineField({
      name: 'year',
      title: 'Year',
      type: 'string',
      initialValue: '2026',
      description: 'e.g. "2026"',
    }),
    defineField({
      name: 'timeline',
      title: 'Timeline / Duration',
      type: 'string',
      description: 'e.g. "2 months (Jul – Aug 2026)"',
    }),
    defineField({
      name: 'role',
      title: 'Role',
      type: 'string',
      description: 'e.g. "Lead AI Engineer & Full-Stack Developer"',
    }),
    defineField({
      name: 'coverImage',
      title: 'Cover Image / Visual Demo',
      type: 'image',
      description: 'Main project screenshot or visual banner',
      options: {hotspot: true},
      fields: [
        defineField({
          name: 'alt',
          title: 'Alt text',
          type: 'string',
        }),
      ],
    }),
    defineField({
      name: 'techStack',
      title: 'Tech Stack (Tags)',
      type: 'array',
      of: [defineArrayMember({type: 'string'})],
      options: {layout: 'tags'},
      description: 'e.g. Python, PyTorch, React, FastAPI, Docker',
    }),
    defineField({
      name: 'liveDemoUrl',
      title: 'Live Demo URL',
      type: 'url',
    }),
    defineField({
      name: 'githubUrl',
      title: 'GitHub Repository URL',
      type: 'url',
    }),
    defineField({
      name: 'order',
      title: 'Display Order',
      type: 'number',
      description: 'Lower number appears first (1, 2, 3...)',
      initialValue: 1,
    }),

    // ── Rich Content Body ──
    defineField({
      name: 'body',
      title: 'Project Content (Body)',
      description: 'Paste your full project writeup here. Supports Headings, Bold, Italics, Lists, Quotes, Images, and Code Blocks.',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'block',
          styles: [
            {title: 'Normal', value: 'normal'},
            {title: 'Heading 2', value: 'h2'},
            {title: 'Heading 3', value: 'h3'},
            {title: 'Heading 4', value: 'h4'},
            {title: 'Quote', value: 'blockquote'},
          ],
          lists: [
            {title: 'Bullet', value: 'bullet'},
            {title: 'Numbered', value: 'number'},
          ],
          marks: {
            decorators: [
              {title: 'Strong (Bold)', value: 'strong'},
              {title: 'Emphasis (Italic)', value: 'em'},
              {title: 'Code', value: 'code'},
              {title: 'Underline', value: 'underline'},
              {title: 'Strike', value: 'strike-through'},
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
          title: 'Inline Image',
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
                  {title: 'SQL', value: 'sql'},
                  {title: 'JSON', value: 'json'},
                  {title: 'HTML', value: 'html'},
                  {title: 'CSS', value: 'css'},
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
              title: 'File name / Description (Optional)',
              type: 'string',
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
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'tagline',
      media: 'coverImage',
    },
  },
})
