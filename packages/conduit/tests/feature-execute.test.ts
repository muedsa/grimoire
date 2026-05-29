import { describe, it, beforeEach, expect } from "vitest";
import { MediaProviderManager } from "../src/media-provider-manager";
import type { MediaProvider } from "../src/types/provider";

const testTimeout = 60 * 1000 * 5; // 5分钟

const provider: MediaProvider = {
  namespace: "com.muedsa.grimoier.example",
  name: "Example Media Provider",
  author: "MUEDSA",
  url: "https://raw.githubusercontent.com/muedsa/grimoire/refs/heads/main/packages/conduit/example/example-media-provider.json",
  version: "0.0.1",
  versionCode: 0,
  features: [
    {
      name: "media-explore",
      entry: "main",
      variables: {},
      nodes: {
        main: [
          {
            type: "set",
            label: "set-node-1",
            variable: "resp",
            value: "${http_get('https://mikanime.tv')}",
          },
          {
            type: "if",
            label: "if-node-2",
            condition: "resp.status < 200 || resp.status >= 300",
            then: [
              {
                type: "exec",
                label: "exec-node-3",
                expression: "throw_err('HTTP_REQ_ERROR', '请求失败')",
              },
            ],
          },
          {
            type: "set",
            label: "set-node-4",
            variable: "$doc",
            value: "${html_parse(resp.body)}",
          },
          {
            type: "set",
            label: "set-node-5",
            variable: "$weekEls",
            value: "${css_select($doc, '#sk-body > .sk-bangumi')}",
          },
          {
            type: "set",
            label: "set-node-6",
            variable: "rows",
            value: [],
          },
          {
            type: "foreach",
            label: "foreach-node-7",
            collection: "$weekEls",
            item: "$weekEl",
            body: [
              {
                type: "set",
                label: "set-node-8",
                variable: "$anLis",
                value: "${css_select($weekEl, '.an-box .an-ul li')}",
              },
              {
                type: "set",
                label: "set-node-9",
                variable: "cards",
                value: [],
              },
              {
                type: "foreach",
                label: "foreach-node-10",
                collection: "$anLis",
                item: "$anLi",
                body: [
                  {
                    type: "set",
                    label: "set-node-11",
                    variable: "mediaCard",
                    value: {
                      id: "${css_select1_attr($anLi, 'span[data-bangumiid]', 'data-bangumiid')}",
                      title:
                        "${css_select1_text($anLi, '.an-info .an-info-group *[title]')}",
                      cover:
                        "https://mikanime.tv${css_select1_attr($anLi, 'span[data-bangumiid]', 'data-src')}",
                      subtitle:
                        "${css_select1_text($anLi, '.an-info .an-info-group .date-text')}",
                    },
                  },
                  {
                    type: "exec",
                    label: "exec-node-12",
                    expression: "arr_push(cards, mediaCard)",
                  },
                ],
              },
              {
                type: "set",
                label: "set-node-13",
                variable: "row",
                value: {
                  title:
                    "${str_trim(css_select1_text($weekEl, 'div[id^=\"data-row-\"]'))}",
                  items: "${cards}",
                  aspectRatio: 1,
                },
              },
              {
                type: "exec",
                label: "exec-node-14",
                expression: "arr_push(rows, row)",
              },
            ],
          },
          {
            type: "return",
            label: "return-node-15",
            value: "rows",
          },
        ],
      },
    },
    {
      name: "media-detail",
      entry: "main",
      variables: {
        mediaId: "",
      },
      nodes: {
        main: [
          {
            type: "set",
            label: "set-node-1",
            variable: "detailPageUrl",
            value: "https://mikanime.tv/Home/Bangumi/${mediaId}",
          },
          {
            type: "set",
            label: "set-node-2",
            variable: "resp",
            value: "${http_get(detailPageUrl)}",
          },
          {
            type: "if",
            label: "if-node-3",
            condition: "resp.status < 200 || resp.status >= 300",
            then: [
              {
                type: "exec",
                label: "exec-node-4",
                expression: "throw_err('HTTP_REQ_ERROR', '请求失败')",
              },
            ],
          },
          {
            type: "set",
            label: "set-node-5",
            variable: "$doc",
            value: "${html_parse(resp.body)}",
          },
          {
            type: "set",
            label: "set-node-6",
            variable: "cover",
            value:
              "${css_select1_attr($doc, '#sk-container .leftbar-container .bangumi-poster', 'style')}",
          },
          {
            type: "set",
            label: "set-node-7",
            variable: "cover",
            value:
              '${str_replace(str_replace(cover, "background-image: url(\'", ""), "\');", "")}',
          },
          {
            type: "set",
            label: "set-node-8",
            variable: "mediaDetail",
            value: {
              id: "${mediaId}",
              title:
                "${css_select1_text($doc, '#sk-container .leftbar-container .bangumi-title')}",
              cover: "https://mikanime.tv${cover}",
              subtitle:
                "${arr_join(css_select_text($doc, '#sk-container .leftbar-container .bangumi-info'), ' | ')}",
              description:
                "${css_select1_text($doc, '#sk-container .central-container .header2-desc')}",
            },
          },
          {
            type: "return",
            label: "return-node-9",
            value: "mediaDetail",
          },
        ],
      },
    },
  ],
};

describe(
  "Feature Execute",
  () => {
    let manager: MediaProviderManager;

    beforeEach(() => {
      manager = new MediaProviderManager();
      manager.registerProvider(provider);
    });

    it("应成功返回媒体栏目列表", async () => {
      const sections = await manager.executeFeature(
        provider.namespace,
        "media-explore",
        null,
      );

      // 返回值应为数组
      expect(sections).toBeDefined();
      expect(Array.isArray(sections)).toBe(true);

      // 至少应有 1 个栏目（一周至少有 1 天有更新）
      expect(sections.length).toBeGreaterThan(0);

      for (const section of sections) {
        // 每个栏目应有 title（周几）
        expect(typeof section.title).toBe("string");
        expect(section.title.length).toBeGreaterThan(0);

        // aspectRatio 应为 1
        expect(section.aspectRatio).toBe(1);

        // items 应为数组且非空
        expect(Array.isArray(section.items)).toBe(true);
        expect(section.items.length).toBeGreaterThan(0);

        for (const item of section.items) {
          // id 应为数字字符串
          expect(typeof item.id).toBe("string");
          expect(item.id.length).toBeGreaterThan(0);

          // title 应为非空字符串
          expect(typeof item.title).toBe("string");
          expect(item.title.length).toBeGreaterThan(0);

          // cover 应以 https://mikanime.tv 开头
          expect(typeof item.cover).toBe("string");
          expect(item.cover).toMatch(/^https:\/\/mikanime\.tv\//);

          // subtitle 为可选字段
          if (item.subtitle !== undefined) {
            expect(typeof item.subtitle).toBe("string");
          }
        }
      }
    });

    it("应成功返回媒体详情", async () => {
      const mediaDetail = await manager.executeFeature(
        provider.namespace,
        "media-detail",
        {
          mediaId: "681",
        },
      );

      // 返回值应为数组
      expect(mediaDetail).toBeDefined();

      console.log(JSON.stringify(mediaDetail, null, 2));

      // id 应为数字字符串
      expect(typeof mediaDetail.id).toBe("string");
      expect(mediaDetail.id.length).toBeGreaterThan(0);

      // title 应为非空字符串
      expect(typeof mediaDetail.title).toBe("string");
      expect(mediaDetail.title.length).toBeGreaterThan(0);

      // cover 应以 https://mikanime.tv 开头
      expect(typeof mediaDetail.cover).toBe("string");
      expect(mediaDetail.cover).toMatch(/^https:\/\/mikanime\.tv\//);

      // subtitle 为可选字段
      if (mediaDetail.subtitle !== undefined) {
        expect(typeof mediaDetail.subtitle).toBe("string");
      }

      // description 为可选字段
      if (mediaDetail.description !== undefined) {
        expect(typeof mediaDetail.subtitle).toBe("string");
      }
    });
  },
  testTimeout,
);
