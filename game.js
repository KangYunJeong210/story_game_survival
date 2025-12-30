/* =========================================================
   Apocalypse VN Engine (Mobile)
   - Background per scene
   - Stats + auto endings
   - Toast notifications on stat changes
   - “강해짐/고립/붕괴”에 따라 선택지 문장(심리) 변형
   - 적: 감염체 + 인간 약탈자(둘 다)
   ========================================================= */

/* -------------------------
   0) Utils
------------------------- */
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

function applyDelta(state, delta = {}) {
  const next = { ...state };
  for (const [k, dv] of Object.entries(delta)) next[k] = (next[k] ?? 0) + dv;

  next.hp = clamp(next.hp, 0, 10);
  next.food = clamp(next.food, 0, 10);
  next.power = clamp(next.power, 0, 10);
  next.distance = clamp(next.distance, 0, 10);
  next.loss = clamp(next.loss, 0, 10);
  next.day = clamp(next.day, 1, 999);

  return next;
}

function checkAutoEnding(state) {
  if (state.hp <= 0) return "end_dead";
  if (state.food <= 0) return "end_starve";
  if (state.loss >= 10) return "end_break";
  return null;
}

function meetsCond(state, cond) {
  if (!cond) return true;
  for (const [key, val] of Object.entries(cond)) {
    if (key.endsWith("_gte")) {
      const stat = key.replace("_gte", "");
      if ((state[stat] ?? 0) < val) return false;
    }
    if (key.endsWith("_lte")) {
      const stat = key.replace("_lte", "");
      if ((state[stat] ?? 0) > val) return false;
    }
  }
  return true;
}

/* -------------------------
   1) Mind mode (심리 문장)
------------------------- */
function getMindMode(state) {
  // 상실감이 높으면, 문장 자체가 무너지는 톤으로
  if (state.loss >= 7) return "broken";

  // 강해짐/고립 중 우세 판정
  if (state.power - state.distance >= 2) return "power";
  if (state.distance - state.power >= 2) return "distance";

  return "base";
}

function choiceText(choice, state) {
  // variants가 없으면 기존 text 사용
  if (!choice.variants) return choice.text ?? "";

  const mode = getMindMode(state);
  return (
    choice.variants[mode] ??
    choice.variants.base ??
    choice.text ??
    ""
  );
}

/* -------------------------
   2) State
------------------------- */
const defaultState = {
  day: 1,
  hp: 7,
  food: 4,
  power: 0,     // 🛡 강해짐
  distance: 0,  // 🧱 고립
  loss: 4       // 🖤 상실감
};

let state = { ...defaultState };

/* -------------------------
   3) Scenes (Story Data)
   - bg 경로는 네 이미지 파일명에 맞게 바꾸면 됨.
------------------------- */
const scenes = {
  // ======= PROLOGUE =======
  prologue: {
    bg: "./img/bg_ruins_1.jpg",
    text:
      "비가 내렸다.\n" +
      "함께 버티던 사람은… 결국 여기서 멈췄다.\n" +
      "세상은 멈추지 않는다. 나만 멈춰 있었다.\n\n" +
      "나는 스스로에게 한 문장을 반복한다.\n" +
      "‘다시는…’",
    choices: [
      {
        label: "vow_power",
        variants: {
          base: "다시는 잃지 않기 위해 강해진다.",
          power: "강해진다. 다음엔 내가 지킨다.",
          distance: "강해진다… 그래야 혼자서도 산다.",
          broken: "강해지면… 뭐가 달라질까. 그래도 해."
        },
        next: "route_power_1",
        delta: { power: 2, loss: 1 }
      },
      {
        label: "vow_distance",
        variants: {
          base: "다시는 잃지 않기 위해 아무도 두지 않는다.",
          power: "지킬 게 없으면 잃을 것도 없다.",
          distance: "아무도 곁에 두지 않는다. 그게 답이다.",
          broken: "아무도… 만들지 말자. 제발."
        },
        next: "route_distance_1",
        delta: { distance: 2, loss: 1 }
      },
      {
        label: "survive_first",
        variants: {
          base: "지금은 생각하지 않는다. 일단 살아야 한다.",
          power: "감정은 나중에. 생존이 먼저다.",
          distance: "생존만 한다. 그게 전부다.",
          broken: "…살아야 해. 이유는 없어도."
        },
        next: "day_start",
        delta: { hp: 1, food: -1 }
      }
    ]
  },

  // ======= ROUTE: POWER =======
  route_power_1: {
    bg: "./img/bg_training.jpg",
    text:
      "손이 떨렸지만 무기를 들었다.\n" +
      "들지 않으면, 또 빼앗긴다.\n\n" +
      "강해지자.\n" +
      "다음번엔—지킬 수 있게.",
    choices: [
      {
        label: "search_armory",
        variants: {
          base: "근처 창고를 수색한다 (위험)",
          power: "창고를 턴다. 무기부터 확보한다.",
          distance: "창고를 수색한다. 사람은 마주치지 말자.",
          broken: "창고… 뭐라도 있어야 하니까."
        },
        next: "warehouse_1",
        delta: { food: 1, loss: 1 }
      },
      {
        label: "train",
        variants: {
          base: "혼자 훈련 루틴을 만든다",
          power: "훈련한다. 내 몸을 무기로 만든다.",
          distance: "혼자 훈련한다. 혼자가 더 빠르다.",
          broken: "몸이 아프면… 생각이 덜 나."
        },
        next: "training_1",
        delta: { power: 1, hp: -1 }
      }
    ]
  },

  training_1: {
    bg: "./img/bg_rooftop.jpg",
    text:
      "계단을 오르고, 숨이 차오르고, 팔이 저려도 멈추지 않았다.\n" +
      "멈추는 순간 떠올라버리니까.\n\n" +
      "몸이 버티는 만큼 마음도 버틸 수 있을까?",
    choices: [
      {
        label: "push",
        variants: {
          base: "오늘은 끝까지 한다",
          power: "끝까지 간다. 약해질 틈은 없다.",
          distance: "끝까지. 누구도 나 대신 못 해.",
          broken: "끝까지… 무너질 때까지."
        },
        next: "day_start",
        delta: { power: 1, hp: -1, loss: 1 }
      },
      {
        label: "stop",
        variants: {
          base: "적당히 멈춘다",
          power: "지금은 멈춘다. 살아야 강해진다.",
          distance: "멈춘다. 불필요한 소모는 싫다.",
          broken: "…멈춘다. 더는 못 하겠어."
        },
        next: "day_start",
        delta: { loss: -1 }
      }
    ]
  },

  // ======= ROUTE: DISTANCE =======
  route_distance_1: {
    bg: "./img/bg_hallway.jpg",
    text:
      "사람은 짐이 된다.\n" +
      "그리고 짐은 언젠가 떨어뜨려진다.\n\n" +
      "나는 더 이상 들고 가지 않기로 했다.",
    choices: [
      {
        label: "cut_radio",
        variants: {
          base: "무전기 채널을 끊는다",
          power: "신호는 함정일 수도 있다. 끊는다.",
          distance: "끊는다. 연결이 곧 위험이다.",
          broken: "지직… 조용해져. 제발."
        },
        next: "radio_cut",
        delta: { distance: 1, loss: -1 }
      },
      {
        label: "stealth_route",
        variants: {
          base: "기척이 나면 피하는 동선을 만든다",
          power: "피하되, 필요하면 맞서겠다.",
          distance: "피한다. 무조건 피한다.",
          broken: "피해… 제발 날 찾지 마."
        },
        next: "stealth_1",
        delta: { distance: 1 }
      }
    ]
  },

  radio_cut: {
    bg: "./img/bg_radio.jpg",
    text:
      "지직.\n" +
      "손가락 하나로 연결을 끊었다.\n" +
      "조용해졌다. 안전해졌다.\n\n" +
      "…정말로?",
    choices: [
      {
        label: "choose_silence",
        variants: {
          base: "조용함을 선택한다",
          power: "정보가 없으면 판단도 못 해. 하지만… 지금은 조용히.",
          distance: "조용함이 안전이다.",
          broken: "조용해… 더는 들리지 마."
        },
        next: "day_start",
        delta: { distance: 1 }
      },
      {
        label: "turn_back_on",
        variants: {
          base: "잠깐만. 다시 켜볼까(흔들림)",
          power: "정보는 무기다. 잠깐만 확인.",
          distance: "…아니, 안 돼. 그런데도 손이 간다.",
          broken: "혹시… 살아있는 사람이…?"
        },
        next: "day_start",
        delta: { distance: -1, loss: 1 }
      }
    ]
  },

  stealth_1: {
    bg: "./img/bg_alley.jpg",
    text:
      "사람이 있는 곳엔 문제가 생긴다.\n" +
      "나는 문제를 피하기로 했다.\n\n" +
      "발자국 소리조차 남기지 않는 방식으로.",
    choices: [
      {
        label: "move_shadow",
        variants: {
          base: "그늘로 이동한다",
          power: "그늘로 이동. 필요하면 역습한다.",
          distance: "그늘로 이동. 들키지 않는다.",
          broken: "그늘… 거기면 아무도 못 보겠지."
        },
        next: "day_start",
        delta: { distance: 1 }
      },
      {
        label: "risk_for_food",
        variants: {
          base: "식량을 위해 위험을 감수한다",
          power: "식량은 전쟁이다. 가져온다.",
          distance: "잠깐만… 필요한 만큼만.",
          broken: "배고프면… 더 생각나."
        },
        next: "warehouse_1",
        delta: { food: 1, hp: -1 }
      }
    ]
  },

  // ======= DAY LOOP START =======
  day_start: {
    bg: "./img/bg_crossroad.jpg",
    text:
      "하루 " + "—" + " 또 시작됐다.\n" +
      "물과 식량, 그리고 조용한 위험.\n" +
      "오늘의 선택이 오늘 밤을 만든다.",
    // NOTE: day 표시를 동적으로 넣고 싶으면 render()에서 text 가공해도 됨.
    choices: [
      {
        label: "go_market",
        variants: {
          base: "폐마트로 간다 (식량 확보)",
          power: "폐마트로 간다. 위험하면 내가 처리한다.",
          distance: "폐마트로 간다… 빠르게, 들키지 않게.",
          broken: "폐마트… 어차피 뭘 해도 비슷해."
        },
        next: "market_1",
        delta: { food: 2, hp: -1, loss: 1 }
      },
      {
        label: "go_houses",
        variants: {
          base: "주택가를 돈다 (안전 우선)",
          power: "주택가를 훑는다. 위험 요소부터 제거한다.",
          distance: "주택가로 간다. 사람 흔적 보이면 즉시 우회.",
          broken: "조용한 곳이면… 뭐든 괜찮아."
        },
        next: "houses_1",
        delta: { hp: 1, food: -1 }
      },
      {
        label: "avoid_traces",
        variants: {
          base: "사람 흔적을 피한다 (고립 강화)",
          power: "피하지 않는다. 다만 통제할 뿐.",
          distance: "피한다. 엮이면 끝이다.",
          broken: "피해… 어디로든."
        },
        next: "solo_1",
        delta: { distance: 1, food: -1 },
        cond: { distance_gte: 2 }
      },
      {
        label: "push_through",
        variants: {
          base: "위험한 길도 뚫는다 (강함 강화)",
          power: "뚫는다. 망설이면 죽는다.",
          distance: "…혼자라도 할 수 있어. 해야 해.",
          broken: "뚫어. 다 망가지게."
        },
        next: "fight_1",
        delta: { power: 1, hp: -1 },
        cond: { power_gte: 2 }
      }
    ]
  },

  // ======= MARKET (human + infected) =======
  market_1: {
    bg: "./img/bg_market.jpg",
    text:
      "선반은 거의 비어 있었다.\n" +
      "그래도 바닥에 떨어진 통조림 하나.\n\n" +
      "그때—발소리.\n" +
      "사람이다. 아니면… 감염체일 수도.",
    choices: [
      {
        label: "hide",
        variants: {
          base: "숨는다",
          power: "숨는다. 먼저 상황 파악.",
          distance: "숨는다. 절대 엮이지 않는다.",
          broken: "숨… 쉬지 마."
        },
        next: "market_hide",
        delta: { distance: 1 }
      },
      {
        label: "confront",
        variants: {
          base: "대면한다",
          power: "대면한다. 먼저 주도권을 잡는다.",
          distance: "대면… 최소한의 말만.",
          broken: "대면… 뭐가 달라지는데."
        },
        next: "market_face",
        delta: { loss: 1 },
        cond: { distance_lte: 7 }
      },
      {
        label: "steal",
        variants: {
          base: "빼앗는다 (위험)",
          power: "빼앗는다. 약한 쪽이 잃는다.",
          distance: "…빼앗고 바로 사라진다.",
          broken: "빼앗아. 어차피 다 뺏기잖아."
        },
        next: "market_steal",
        delta: { power: 1, loss: 2, food: 1 },
        cond: { power_gte: 3 }
      }
    ]
  },

  market_hide: {
    bg: "./img/bg_market_dark.jpg",
    text:
      "선반 뒤에 몸을 붙였다.\n" +
      "그림자 사이로 보이는 실루엣—\n\n" +
      "낮게 중얼거린다.\n" +
      "…사람이다. 하지만 손에 든 건 칼.\n" +
      "약탈자다.",
    choices: [
      {
        label: "wait_out",
        variants: {
          base: "지나가길 기다린다",
          power: "숨었다가 기회 보면 따라간다.",
          distance: "기다린다. 안 들키면 된다.",
          broken: "…빨리 지나가."
        },
        next: "after_encounter",
        delta: { loss: 0 }
      },
      {
        label: "ambush",
        variants: {
          base: "기습한다",
          power: "기습한다. 먼저 치면 산다.",
          distance: "기습… 하고 바로 끊는다.",
          broken: "끝내자. 빨리."
        },
        next: "after_encounter",
        delta: { power: 1, hp: -1, loss: 1 },
        cond: { power_gte: 4 }
      }
    ]
  },

  market_face: {
    bg: "./img/bg_market_face.jpg",
    text:
      "“거기 누구야?”\n" +
      "상대의 목소리가 날카롭다.\n\n" +
      "눈이 마주친 순간, 상대가 웃는다.\n" +
      "—사람이지만, 사람 같지 않다.",
    choices: [
      {
        label: "negotiate",
        variants: {
          base: "교환을 제안한다",
          power: "교환. 하지만 주도권은 내가.",
          distance: "교환… 최소한으로.",
          broken: "교환? 웃기네."
        },
        next: "after_encounter",
        delta: { food: -1, loss: 0 }
      },
      {
        label: "back_off",
        variants: {
          base: "천천히 물러난다",
          power: "물러난다. 싸움은 선택이다.",
          distance: "물러난다. 엮지 않는다.",
          broken: "…그냥 가."
        },
        next: "after_encounter",
        delta: { distance: 1, loss: -1 }
      },
      {
        label: "draw_weapon",
        variants: {
          base: "무기를 꺼낸다",
          power: "무기를 꺼낸다. 끝까지 간다.",
          distance: "무기… 보여주고 바로 벗어난다.",
          broken: "꺼내. 다 귀찮아."
        },
        next: "after_encounter",
        delta: { power: 1, hp: -1, loss: 1 },
        cond: { power_gte: 3 }
      }
    ]
  },

  market_steal: {
    bg: "./img/bg_market_run.jpg",
    text:
      "손이 먼저 움직였다.\n" +
      "통조림—그리고 가방.\n\n" +
      "뒤에서 욕설과 발소리.\n" +
      "약탈자다.\n" +
      "게다가… 멀리서 이상한 끙끙거림.\n" +
      "감염체까지 끌려온다.",
    choices: [
      {
        label: "sprint",
        variants: {
          base: "전력질주한다",
          power: "전력질주. 막히면 치고 나간다.",
          distance: "전력질주. 뒤돌아보지 않는다.",
          broken: "뛰어. 끝까지."
        },
        next: "after_encounter",
        delta: { hp: -1 }
      },
      {
        label: "hide_in_store",
        variants: {
          base: "가게 안쪽으로 숨는다",
          power: "숨었다가 역으로 각개격파.",
          distance: "숨는다. 조용히, 조용히.",
          broken: "숨자…"
        },
        next: "after_encounter",
        delta: { distance: 1, loss: 1 }
      }
    ]
  },

  // ======= HOUSES (infected) =======
  houses_1: {
    bg: "./img/bg_houses.jpg",
    text:
      "조용한 골목.\n" +
      "문 하나를 열면 또 다른 하루가 열린다.\n\n" +
      "하지만 조용함은 늘 함정이었다.\n" +
      "…문 너머에서, 긁는 소리.",
    choices: [
      {
        label: "enter",
        variants: {
          base: "문을 연다",
          power: "연다. 들어가서 처리한다.",
          distance: "연다… 확인만 하고 바로 나올 준비.",
          broken: "연다… 어차피."
        },
        next: "house_inside",
        delta: { food: 1, hp: -1 }
      },
      {
        label: "leave",
        variants: {
          base: "지나친다",
          power: "지나친다. 싸움은 자원 낭비다.",
          distance: "지나친다. 위험은 피한다.",
          broken: "지나쳐…"
        },
        next: "after_encounter",
        delta: { distance: 1, loss: -1 }
      }
    ]
  },

  house_inside: {
    bg: "./img/bg_house_inside.jpg",
    text:
      "안은 엉망이다.\n" +
      "식탁 위의 빈 약병.\n\n" +
      "그리고 부엌에서—\n" +
      "감염체가 몸을 돌린다.\n" +
      "눈이… 텅 비어 있다.",
    choices: [
      {
        label: "fight_infected",
        variants: {
          base: "맞서 싸운다",
          power: "맞서 싸운다. 지금 아니면 더 위험해진다.",
          distance: "싸운다… 하지만 짧게, 빠르게.",
          broken: "싸워. 끝내."
        },
        next: "after_encounter",
        delta: { power: 1, hp: -1, loss: 1 }
      },
      {
        label: "escape",
        variants: {
          base: "도망친다",
          power: "도망. 살아야 다음이 있다.",
          distance: "도망. 엮지 않는다.",
          broken: "도망…"
        },
        next: "after_encounter",
        delta: { distance: 1 }
      }
    ]
  },

  // ======= SOLO (psych) =======
  solo_1: {
    bg: "./img/bg_solo.jpg",
    text:
      "혼자는 빠르고, 조용하고, 예측 가능하다.\n" +
      "그런데도 가끔—\n" +
      "옆이 비어 있는 게 너무 크게 느껴졌다.",
    choices: [
      {
        label: "erase_thought",
        variants: {
          base: "생각을 지운다",
          power: "생각을 지운다. 감정은 약점이다.",
          distance: "지운다. 어차피 혼자다.",
          broken: "지워… 지워…"
        },
        next: "after_encounter",
        delta: { loss: -1 }
      },
      {
        label: "hold_memory",
        variants: {
          base: "기억을 꺼낸다",
          power: "기억을 꺼낸다. 다음엔 지킬 수 있게.",
          distance: "기억을 꺼낸다… 그래서 더 혼자가 된다.",
          broken: "…미안해."
        },
        next: "after_encounter",
        delta: { loss: 2 }
      }
    ]
  },

  // ======= FIGHT PATH (mixed enemy) =======
  fight_1: {
    bg: "./img/bg_fight.jpg",
    text:
      "위험은 늘 예상보다 가까웠다.\n" +
      "골목 끝에 약탈자 둘.\n" +
      "그리고 그 뒤를 쫓아오는 감염체 하나.\n\n" +
      "서로를 이용하려는 눈빛.\n" +
      "이곳은 지옥이다.",
    choices: [
      {
        label: "push_through_fight",
        variants: {
          base: "밀어붙인다",
          power: "밀어붙인다. 다 넘어뜨리고 지나간다.",
          distance: "밀어붙인다. 틈만 보면 빠져나간다.",
          broken: "밀어… 다 끝내."
        },
        next: "after_encounter",
        delta: { power: 1, hp: -1, loss: 1 }
      },
      {
        label: "let_them_clash",
        variants: {
          base: "서로 싸우게 둔다 (틈새 이동)",
          power: "붙게 둔다. 나는 최적의 순간만 친다.",
          distance: "붙게 둔다. 나는 조용히 빠진다.",
          broken: "싸워… 다 같이 망해."
        },
        next: "after_encounter",
        delta: { distance: 1, loss: 0 }
      }
    ]
  },

  // ======= END OF DAY =======
  after_encounter: {
    bg: "./img/bg_sunset.jpg",
    text:
      "해가 기울었다.\n" +
      "오늘도 살아남았다.\n\n" +
      "문제는… 내일도 같은 방식으로 살아남을 수 있냐는 거다.",
    choices: [
      {
        label: "sleep",
        variants: {
          base: "오늘을 마무리한다",
          power: "정비하고 쉰다. 내일은 더 단단해진다.",
          distance: "쉰다. 누구도 필요 없다.",
          broken: "…끝내자. 오늘도."
        },
        next: "end_check",
        delta: { food: -1, day: 1 }
      }
    ]
  },

  // ======= ENDING CHECK =======
  end_check: {
    bg: "./img/bg_night.jpg",
    text:
      "밤.\n" +
      "나는 조용히 스스로에게 묻는다.\n\n" +
      "‘나는 어떤 사람이 되어가고 있지?’",
    choices: [
      {
        label: "continue",
        variants: {
          base: "계속",
          power: "계속. 더 강해진다.",
          distance: "계속. 더 조용해진다.",
          broken: "계속…"
        },
        next: "resolve_end",
        delta: {}
      }
    ]
  },

  resolve_end: {
    bg: "./img/bg_night.jpg",
    text: "…",
    choices: [] // 상태 기반 자동 분기
  },

  // ======= ENDINGS =======
  end_dead: {
    bg: "./img/bg_black.jpg",
    text: "시야가 어두워졌다.\n(엔딩: 사망)",
    choices: [{ text: "처음부터", next: "prologue", delta: "RESET" }]
  },
  end_starve: {
    bg: "./img/bg_empty.jpg",
    text: "배고픔은 통증이 아니라 공백이 되었다.\n(엔딩: 아사)",
    choices: [{ text: "처음부터", next: "prologue", delta: "RESET" }]
  },
  end_break: {
    bg: "./img/bg_rain.jpg",
    text:
      "마음이 먼저 무너졌다.\n" +
      "살아 있어도, 이미 끝난 것 같았다.\n(엔딩: 붕괴)",
    choices: [{ text: "처음부터", next: "prologue", delta: "RESET" }]
  },
  end_guardian: {
    bg: "./img/bg_base.jpg",
    text:
      "나는 강해졌다.\n" +
      "지키는 건 두려웠지만—도망치지 않기로 했다.\n\n" +
      "누군가가 내 옆에 서도, 이번엔… 손을 놓지 않는다.\n(엔딩: 수호자)",
    choices: [{ text: "처음부터", next: "prologue", delta: "RESET" }]
  },
  end_lonely: {
    bg: "./img/bg_road.jpg",
    text:
      "나는 끝까지 혼자였다.\n" +
      "아무도 잃지 않았다.\n\n" +
      "대신, 아무도 남지 않았다.\n(엔딩: 고독한 생존자)",
    choices: [{ text: "처음부터", next: "prologue", delta: "RESET" }]
  },
  end_hollow: {
    bg: "./img/bg_room.jpg",
    text:
      "살아남는 법은 배웠다.\n" +
      "하지만 살아가는 법은—배우지 못했다.\n(엔딩: 텅 빈 생존)",
    choices: [{ text: "처음부터", next: "prologue", delta: "RESET" }]
  }
};

/* -------------------------
   4) DOM
------------------------- */
const gameEl = document.getElementById("game");
const textEl = document.getElementById("text");
const choicesEl = document.getElementById("choices");
const dayEl = document.getElementById("day");
const hpEl = document.getElementById("hp");
const foodEl = document.getElementById("food");
const powerEl = document.getElementById("power");
const distanceEl = document.getElementById("distance");
const lossEl = document.getElementById("loss");

const toastLayer = document.getElementById("toastLayer"); // index.html에 <div id="toastLayer"></div> 필요
const restartBtn = document.getElementById("restart");

/* -------------------------
   5) Toast + HUD bump
------------------------- */
function showToast(message, tone = "pos") {
  if (!toastLayer) return;
  const t = document.createElement("div");
  t.className = `toast ${tone}`;
  t.textContent = message;
  toastLayer.appendChild(t);
  setTimeout(() => t.remove(), 1700);
}

function bump(el) {
  if (!el) return;
  el.classList.remove("bump");
  void el.offsetWidth; // reflow
  el.classList.add("bump");
}

/* -------------------------
   6) HUD / BG / Reset
------------------------- */
function updateHUD() {
  hpEl.textContent = `❤️ ${state.hp}`;
  foodEl.textContent = `🍔 ${state.food}`;
  powerEl.textContent = `🦾 ${state.power}`;
  distanceEl.textContent = `🧱 ${state.distance}`;
  lossEl.textContent = `🖤 ${state.loss}`;
  dayEl.textContent = `📅 DAY ${state.day}`;
}

function setBackground(bgPath) {
  gameEl.style.backgroundImage = bgPath ? `url("${bgPath}")` : "none";
}

function resetGame() {
  state = { ...defaultState };
  updateHUD();
}

/* -------------------------
   7) Ending resolver
------------------------- */
function resolveEndingFromState() {
  const auto = checkAutoEnding(state);
  if (auto) return auto;

  // 수호자 엔딩: 강해짐 높고 고립 낮음 + 어느 정도 체력
  if (state.power >= 6 && state.distance <= 4 && state.hp >= 3) return "end_guardian";

  // 고독 엔딩: 고립 매우 높음
  if (state.distance >= 7) return "end_lonely";

  // 텅 빈 생존: 강해짐도 높고 상실도 높음 (계속 지키려다 닫혀버림)
  if (state.power >= 5 && state.loss >= 7) return "end_hollow";

  // 아직 조건이 애매하면 루프 계속
  return "day_start";
}

/* -------------------------
   8) Render
------------------------- */
function render(sceneId) {
  if (sceneId === "resolve_end") {
    const endId = resolveEndingFromState();
    return render(endId);
  }

  const scene = scenes[sceneId];
  if (!scene) return;

  // bg, text
  setBackground(scene.bg);

  // day text 동적 치환(원하면)
  // scene.text 안에 {day}가 있으면 현재 day로 바꿔줌
  const rawText = scene.text ?? "";
  textEl.textContent = rawText.replaceAll("{day}", String(state.day));

  // choices
  choicesEl.innerHTML = "";

  const availableChoices = (scene.choices || []).filter(c => meetsCond(state, c.cond));

  availableChoices.forEach(choice => {
    const btn = document.createElement("button");
    btn.className = "choice";
    btn.type = "button";

    btn.textContent = choiceText(choice, state);

    btn.addEventListener("click", () => {
      // RESET
      if (choice.delta === "RESET") {
        resetGame();
        return render(choice.next);
      }

      // before/after diff
      const before = { ...state };
      state = applyDelta(state, choice.delta);

      const diff = {
        hp: state.hp - before.hp,
        food: state.food - before.food,
        power: state.power - before.power,
        distance: state.distance - before.distance,
        loss: state.loss - before.loss
      };

      // auto endings
      const autoEnd = checkAutoEnding(state);
      updateHUD();

      // toast
      const parts = [];
      if (diff.hp) parts.push(`${diff.hp > 0 ? "+" : ""}${diff.hp} ❤️`);
      if (diff.food) parts.push(`${diff.food > 0 ? "+" : ""}${diff.food} 🍞`);
      if (diff.power) parts.push(`${diff.power > 0 ? "+" : ""}${diff.power} 🛡`);
      if (diff.distance) parts.push(`${diff.distance > 0 ? "+" : ""}${diff.distance} 🧱`);
      if (diff.loss) parts.push(`${diff.loss > 0 ? "+" : ""}${diff.loss} 🖤`);

      if (parts.length) {
        const tone = parts.some(p => p.trim().startsWith("-")) ? "neg" : "pos";
        showToast(parts.join("   "), tone);
      }

      // bump changed stats
      if (diff.hp) bump(hpEl);
      if (diff.food) bump(foodEl);
      if (diff.power) bump(powerEl);
      if (diff.distance) bump(distanceEl);
      if (diff.loss) bump(lossEl);

      if (autoEnd) return render(autoEnd);

      // next
      render(choice.next);
    });

    choicesEl.appendChild(btn);
  });

  // fallback
  if (availableChoices.length === 0) {
    const btn = document.createElement("button");
    btn.className = "choice";
    btn.type = "button";
    btn.textContent = "계속";
    btn.addEventListener("click", () => render("day_start"));
    choicesEl.appendChild(btn);
  }
}

/* -------------------------
   9) Restart
------------------------- */
restartBtn?.addEventListener("click", () => {
  resetGame();
  render("prologue");
});

/* -------------------------
   10) Start
------------------------- */
resetGame();
render("prologue");
