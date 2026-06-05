import { MediaProvider } from "@grimoire/conduit";

export const mediaProviderMock: MediaProvider = {
  namespace: "com.muedsa.grimoier.example",
  name: "示例媒体源",
  author: "MUEDSA",
  url: "https://github.com/muedsa/grimoire",
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
