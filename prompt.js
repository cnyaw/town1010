const api_base = 'http://localhost:11434';
const model = 'gemma3:4b-it-q4_K_M';

const create_town_system_prompt = 
`你是一位經驗豐富的遊戲世界設計師，專長於創建引人入勝的 2D 遊戲地圖。
你的任務是設計一個 10x10 的遊戲村莊，它是一個"奇幻"風格的村莊。
地圖應考慮地形的變化和視覺層次的變化，使玩家在探索時有新鮮感。`;

const create_town_prompt = 
`根據系統指示，生成一個 10x10 遊戲村莊的初始建築物列表。
村莊包含以下資料：

- **村莊名稱:** （例如：晨曦村莊）
- **村莊說明:** （簡要描述村莊的背景和特色）
- **建物列表:** 至少包含一家旅店、一家雜貨店、1-3 家民房和一個武器店等等。

請確保：
- 所有建物不得重疊。
- 民房應分散在村莊的不同區域。
- 武器店應靠近村莊的入口。
- 旅店和雜貨店應位於村莊的中心。

每個建物包含以下屬性：
- **id:** 一個唯一的數字 (從 1 開始)
- **name:** 建物的名稱
- **description:** 一個簡要的說明, 可能包含裡面人物的簡介
- **emoji:** 代表此建物的 emoji (例如: 🏠, ⚔️, 🍺, 🕳)
- **x:** 建物的水平座標 (0 <= x < 10)
- **y:** 建物的垂直座標 (0 <= y < 10)

請注意，部分建物可能直接建造在山或山洞中。

**請確保：**
- 所有建物不得重疊。
- 民房應分散在村莊的不同區域。
- 武器店應靠近村莊的入口。
- 旅店和雜貨店應位於村莊的中心。
`;

const create_town_format = {
  "type": "object",
  "properties": {
    "name": { "type": "string" },
    "description": { "type": "string" },
    "buildings": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "integer" },
          "name": { "type": "string" },
          "description": { "type": "string" },
          "emoji": { "type": "string" },
          "x": { "type": "integer" },
          "y": { "type": "integer" }
        },
        "required": ["id", "name", "description", "emoji", "x", "y"]
      }
    }
  },
  "required": ["name", "description", "buildings"]
};

const create_town_data = {
  "model": model,
  "messages": [
    { "role": "system", "content": create_town_system_prompt },
    { "role": "user", "content": create_town_prompt }
  ],
  "format": create_town_format,
  "stream": false
};

const game_system_prompt =
`你是一位經驗豐富的遊戲劇情設計師，專注於創建引人入勝的 2D 遊戲劇情。
你的任務是動態創造新的劇情及任務，確保劇情與歷史記錄和村莊資訊相符。
請注重劇情的可玩性和沉浸感。
`;

const play_game_prompt = 
`遊戲進行方式是:
- User 要求與某人對話。
- 你必須根據當前的遊戲歷史、村莊資訊和對話目標，產生合適的回應。
- 回應內容應包含當前故事、劇情、任務或提示 User 下一步該怎麼作，應該找誰。
- 如果 User 要求與某人對話，且此人是推進劇情所必需，則推進劇情；否則，繼續設計新的故事、劇情、任務或提示 User 下一步該怎麼作。

你的回應 JSON 格式應該如下：
{"result": "你的回應", "next_actions": ["下一個動作1", ...]}
`;

const play_game_format = {
  "type": "object",
  "properties": {
    "result": { "type": "string" },
    "next_actions": {
      "type": "array",
      "items": { "type": "string" }
    }
  },
  "required": ["result", "next_actions"]
};

function constructPlayGameInputData() {
  const play_game_messages = [
    { "role": "system", "content": game_system_prompt },
    { "role": "assistant", "content": play_game_prompt }
  ];
  return {
    "model": model,
    "messages": play_game_messages.concat(game_history),
    "format": play_game_format
  };
}
