import { defineConfig } from "vitepress";

export default defineConfig({
  title: "UCR",
  description:
    "Universal Code Registry documentation for Apache-2.0 source-owned installs in Bun-managed projects.",
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
        text: "Trust",
        link: "/reference/trust",
      },
      {
        text: "Reference",
        link: "/reference/official-registry",
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
              text: "Private Registries",
              link: "/guide/private-registries",
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
              text: "Official Registry",
              link: "/reference/official-registry",
            },
            {
              text: "Trust And Scope",
              link: "/reference/trust",
            },
            {
              text: "Registry Spec",
              link: "/reference/registry-spec",
            },
            {
              text: "Adapters",
              link: "/reference/adapters",
            },
            {
              text: "Project Files",
              link: "/reference/project-files",
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
      message: "Apache-2.0 source registry documentation for Bun-managed projects.",
    },
  },
});
