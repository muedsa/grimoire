import { describe, it, expect } from "vitest";
import { RuleEngine, RuleDefinition } from "../src/index";

describe("Example", () => {
  it("http request", async () => {
    const engine = new RuleEngine();
    const rule: RuleDefinition = {
      name: "sigil-exported",
      entry: "main",
      variables: {},
      nodes: {
        main: [
          {
            type: "set",
            label: "set-node-1",
            variable: "resp",
            value: "${http_get('https://api.bgm.tv/calendar')}",
          },
          {
            type: "return",
            label: "return-node-2",
            value: "resp.body",
          },
        ],
      },
    };
    const result = await engine.execute(rule);
    expect(result.status).toBe("success");
    console.log(result.data);
  });

  it("http request and build data", async () => {
    const engine = new RuleEngine();
    const rule: RuleDefinition = {
      name: "sigil-exported",
      entry: "main",
      variables: {},
      nodes: {
        main: [
          {
            type: "set",
            label: "set-node-1",
            variable: "resp",
            value: "${http_get('https://api.bgm.tv/calendar')}",
          },
          {
            type: "if",
            label: "if-node-7",
            condition: "resp.status < 200 || resp.status >= 300",
            then: [
              {
                type: "exec",
                label: "exec-node-8",
                expression: "throw_err('HTTP_REQ_ERROR', '请求失败')",
              },
            ],
          },
          {
            type: "set",
            label: "set-node-10",
            variable: "weekdays",
            value: "${json_parse(resp.body)}",
          },
          {
            type: "set",
            label: "set-node-11",
            variable: "sections",
            value: [],
          },
          {
            type: "foreach",
            label: "foreach-node-12",
            collection: "weekdays",
            item: "week",
            body: [
              {
                type: "set",
                label: "set-node-13",
                variable: "cards",
                value: [],
              },
              {
                type: "foreach",
                label: "foreach-node-14",
                collection: "week.items",
                item: "item",
                body: [
                  {
                    type: "set",
                    label: "set-node-15",
                    variable: "mediaCard",
                    value: {
                      id: "${item.id}",
                      title: "${item.name_cn || item.name}",
                      cover: "${item.images.large || item.images.common}",
                      subtitle: "${item.rating.score}分",
                    },
                  },
                  {
                    type: "exec",
                    label: "exec-node-17",
                    expression: "arr_push(cards, mediaCard)",
                  },
                ],
              },
              {
                type: "set",
                label: "set-node-18",
                variable: "section",
                value: {
                  title: "每日放送-${week.weekday.cn}",
                  items: "${cards}",
                  aspectRatio: 0.75,
                  type: "cover",
                },
              },
              {
                type: "exec",
                label: "exec-node-19",
                expression: "arr_push(sections, section)",
              },
            ],
          },
          {
            type: "return",
            label: "return-node-20",
            value: "sections",
          },
        ],
      },
    };
    const result = await engine.execute(rule);
    expect(result.status).toBe("success");
    console.log(result.data);
  });
});
