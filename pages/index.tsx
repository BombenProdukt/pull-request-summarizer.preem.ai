import Head from "next/head";

import { Layout } from "@/components/layout";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Configuration, OpenAIApi } from "openai";

async function getMergeCommitHash(user: string, repo: string, ref: string) {
  const { merge_commit_sha } = await (await fetch(`https://api.github.com/repos/${user}/${repo}/pulls/${ref}`)).json();

  return merge_commit_sha;
}

async function getCommitFiles(user: string, repo: string, ref: string) {
  const { files } = await (await fetch(`https://api.github.com/repos/${user}/${repo}/commits/${ref}`)).json();

  return files;
}

async function getSummary(apiKey: string, model: string, content: string) {
  const openai = new OpenAIApi(new Configuration({ apiKey }));
  const response = await openai.createChatCompletion({
    model,
    messages: [
      {
        role: "system",
        content: [
          "You are a senior software engineer.",
          "You need to summarize this git diff in a concise manner, no more than a short sentence.",
          "You need to write the summary in present tense.",
          "You need to phrase it like a \"Keep a Changelog\" entry.",
          "Provide back only the summary, nothing before and nothing after.",
        ].join(" "),
      },
      {
        role: "user",
        content,
      },
    ],
    temperature: 0,
    top_p: 1,
    n: 1,
  });

  if (
    !response.status
    || response.status < 200
    || response.status > 299
  ) {
    let errorMessage = `OpenAI API Error: ${response.status} - ${response.statusText}`;

    if (response.data) {
      errorMessage += `\n\n${response.data}`;
    }

    if (response.status === 500) {
      errorMessage += "\n\nCheck the API status: https://status.openai.com";
    }

    throw new Error(errorMessage);
  }

  return response.data.choices[0].message.content;
}

export default function IndexPage() {
  const [user, setUser] = React.useState<string>("");
  const [repo, setRepo] = React.useState<string>("");
  const [reference, setReference] = React.useState<string>("");
  const [outputText, setOutputText] = React.useState<string>("");
  const [model, setModel] = React.useState<string>("gpt-3.5-turbo");
  const [loading, setLoading] = React.useState<boolean>(false);
  const [apiKey, setApiKey] = React.useState<string>("");

  const processSubmission = async () => {
    setLoading(true);
    setOutputText("");

    try {
      const files = await getCommitFiles(user, repo, await getMergeCommitHash(user, repo, reference));

      const summaries = [];
      for (const file of files) {
        summaries.push(await getSummary(apiKey, model, file.patch));
      }

      setOutputText(summaries.map((summary) => `- ${summary}`).join("\n"));
    } catch (error) {
      setOutputText(error.message);
    }

    setLoading(false);
  };

  React.useEffect(() => {
    const storedApiKey = localStorage.getItem("apiKey");

    if (storedApiKey) {
      setApiKey(storedApiKey);
    }
  }, []);

  return (
    <Layout>
      <Head>
        <title>Next.js</title>
        <meta
          name="description"
          content="Next.js template for building apps with Radix UI and Tailwind CSS"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <section className="container grid items-center gap-6 pb-8 pt-6">
        <div className="flex w-full flex-col justify-between sm:flex-row sm:space-x-4">
          <div className="w-full">
            <span className="text-sm font-bold">User / Organisation</span>
            <Input
              value={user}
              onChange={(value) => setUser(value.target.value)}
            />
          </div>

          <div className="w-full">
            <span className="text-sm font-bold">Repository</span>
            <Input
              value={repo}
              onChange={(value) => setRepo(value.target.value)}
            />
          </div>

          <div className="w-full">
            <span className="text-sm font-bold">Pull Request Number</span>
            <Input
              value={reference}
              onChange={(value) => setReference(value.target.value)}
            />
          </div>
        </div>

        <div className="w-full justify-between sm:flex-row sm:space-x-4">
          <div className="mt-8 flex h-full flex-col justify-center space-y-2 sm:mt-0">
            <div className="text-sm font-bold">Summary</div>

            <Textarea value={outputText} readOnly />
          </div>
        </div>

        <Separator />

        <div className="flex justify-between space-x-4">
          <div className="w-[256px]">
            <Select defaultValue={model} onValueChange={(value) => setModel(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select an OpenAI model" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="gpt-3.5-turbo">GPT-3.5</SelectItem>
                  <SelectItem value="gpt-4">GPT-4.0</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <Input
            type="email"
            placeholder="OpenAI API Key"
            value={apiKey}
            onChange={(value) => {
              setApiKey(value.target.value);

              localStorage.setItem("apiKey", value.target.value);
            }}
          />

          <Button type="submit" onClick={() => processSubmission()} disabled={loading}>Process</Button>
        </div>
      </section>
    </Layout>
  );
}
