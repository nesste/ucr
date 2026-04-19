import { defineConfig } from "vitepress";

export default defineConfig({
  title: "UCR",
  description:
    "Universal Code Registry documentation for source-owned Bun code installs.",
  cleanUrls: true,
  lastUpdated: true,
  themeConfig: {
    siteTitle: "UCR Docs",
    search: {
      provider: "local",
    },
    nav: [
      {
        text: "Guide",
        link: "/guide/quickstart",
      },
      {
        text: "Reference",
        link: "/reference/registry-spec",
      },
      {
        text: "Internals",
        link: "/internals/architecture",
      },
    ],
    sidebar: {
      "/guide/": [
        {
          text: "Guide",
          items: [
            {
              text: "Quickstart",
              link: "/guide/quickstart",
            },
            {
              text: "Concepts",
              link: "/guide/concepts",
            },
            {
              text: "Commands",
              link: "/guide/commands",
            },
            {
              text: "Examples",
              link: "/guide/examples",
            },
            {
              text: "Upgrades",
              link: "/guide/upgrades",
            },
          ],
        },
      ],
      "/reference/": [
        {
          text: "Reference",
          items: [
            {
              text: "Registry Spec",
              link: "/reference/registry-spec",
            },
            {
              text: "Project Files",
              link: "/reference/project-files",
            },
            {
              text: "Adapters",
              link: "/reference/adapters",
            },
          ],
        },
      ],
      "/internals/": [
        {
          text: "Internals",
          items: [
            {
              text: "Architecture",
              link: "/internals/architecture",
            },
            {
              text: "Contributing",
              link: "/internals/contributing",
            },
          ],
        },
      ],
    },
    outline: {
      label: "On this page",
      level: [2, 3],
    },
    footer: {
      message: "Bun-first source registry documentation kept in-repo.",
    },
  },
});
