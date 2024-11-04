import { NavItem } from "@/types/nav";

interface SiteConfig {
  name: string;
  description: string;
  mainNav: NavItem[];
  links: {
    github: string;
  };
}

export const siteConfig: SiteConfig = {
  name: "Pull Request Summarizer • Powered by OpenAI",
  description: "TODO",
  mainNav: [],
  links: {
    github: "https://github.com/shadcn/ui",
  },
};
