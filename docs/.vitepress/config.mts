import { defineConfig } from "vitepress";

export default defineConfig({
  title: "UCR",
  description:
    "Installable source for Bun-managed Bun HTTP and Next App Router projects, with tracked diffs and upgrades.",
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
        text: "GitHub",
        link: "https://github.com/nesste/ucr",
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
