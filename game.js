/* =========================================================
   《남겨진 사람》 (Mobile Story Game Engine)
   - 배경 전환 (scene.bg)
   - 스탯: day, hp, food, power(강해짐), distance(고립), loss(상실)
           party(동행 인원), trust(동행 신뢰)
   - 스탯 변화 토스트(+/-) + HUD bump
   - “강해짐/고립/붕괴”에 따라 선택지 문장(심리형) 변형
   - 엔딩 명칭(정체성 타이틀) 포함
   ========================================================= */

/* -------------------------
   0) Utils
------------------------- */
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

function applyDelta(state, delta = {}) {
  const next = { ...state };
  for (const [k, dv] of Object.entries(delta)) {
    next[k] = (next[k] ?? 0) + dv;
  }

  // clamp
  next.day = clamp(next.day, 1, 9999);
  next.hp = clamp(next.hp, 0, 10);
  next.food = clamp(next.food, 0, 10);
  next.power = clamp(next.power, 0, 10);
  next.distance = clamp(next.distance, 0, 10);
  next.loss = clamp(next.loss, 0, 10);
  next.party = clamp(next.party, 0, 4);
  next.trust = clamp(next.trust, 0, 10);

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
  if (state.loss >= 7) return "broken";
  if (state.power - state.distance >= 2) return "power";
  if (state.distance - state.power >= 2) return "distance";
  return "base";
}

function choiceText(choice, state) {
  if (!choice.variants) return choice.text ?? "";
  const mode = getMindMode(state);
  return choice.variants[mode] ?? choice.variants.base ?? choice.text ?? "";
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
  loss: 4,      // 🖤 상실감

  party: 0,     // 👥 동행 인원
  trust: 0      // 🤝 동행 신뢰
};

let state = { ...defaultState };

/* -------------------------
   3) Scenes
   - bg 경로는 네 이미지 파일명에 맞게 교체하면 됨.
------------------------- */
const scenes = {
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
          distance: "강해져야… 혼자서도 산다.",
          broken: "강해지면… 뭐가 달라질까. 그래도."
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
        label: "just_survive",
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

  /* ===== 강해짐 루트 ===== */
  route_power_1: {
    bg: "./img/bg_training.jpg",
    text:
      "손이 떨렸지만 무기를 들었다.\n" +
      "들지 않으면, 또 빼앗긴다.\n\n" +
      "강해지자.\n" +
      "다음번엔—지킬 수 있게.",
    choices: [
      {
        label: "warehouse",
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
        label: "training",
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

  /* ===== 고립 루트 ===== */
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
        label: "stealth",
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
        label: "silence",
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
        label: "turn_on",
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
        label: "shadow",
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
        label: "risk_food",
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

  /* ===== Day start (공통) ===== */
  day_start: {
    bg: "./img/bg_crossroad.jpg",
    text:
      "📅 DAY {day}\n\n" +
      "하루가 또 시작됐다.\n" +
      "물과 식량, 그리고 조용한 위험.\n" +
      "오늘의 선택이 오늘 밤을 만든다.",
    choices: [
      {
        label: "market",
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
        label: "houses",
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
        label: "follow_signal",
        variants: {
          base: "연기/불빛을 따라간다 (사람일 수도)",
          power: "불빛을 확인한다. 정보는 무기다.",
          distance: "…함정일 수도. 그래도 확인만.",
          broken: "누군가… 있을까."
        },
        next: "meet_survivors",
        delta: { loss: 1 },
        cond: { distance_lte: 9 }
      },
      {
        label: "avoid_people",
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

  /* ===== Market: 인간 약탈자 중심 + 감염체 변수 ===== */
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
        label: "face",
        variants: {
          base: "대면한다",
          power: "대면한다. 주도권을 잡는다.",
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
      "실루엣—사람이다. 손에 든 건 칼.\n" +
      "약탈자.\n\n" +
      "그리고 멀리서… 감염체의 끙끙거림.\n" +
      "둘 다 끌려올 수 있다.",
    choices: [
      {
        label: "wait",
        variants: {
          base: "지나가길 기다린다",
          power: "숨었다가 따라가 약점을 본다.",
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
      "웃는다. 사람인데—사람 같지 않다.\n" +
      "약탈자의 웃음이다.",
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
        label: "back",
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
        label: "draw",
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
      "게다가 감염체까지 소리에 끌린다.",
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
        label: "hide_store",
        variants: {
          base: "가게 안쪽으로 숨는다",
          power: "숨었다가 역으로 끊는다.",
          distance: "숨는다. 조용히, 조용히.",
          broken: "숨자…"
        },
        next: "after_encounter",
        delta: { distance: 1, loss: 1 }
      }
    ]
  },

  /* ===== Houses: 감염체 ===== */
  houses_1: {
    bg: "./img/bg_houses.jpg",
    text:
      "조용한 골목.\n" +
      "문 하나를 열면 또 다른 하루가 열린다.\n\n" +
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
        label: "pass",
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
      "부엌에서—감염체가 몸을 돌린다.\n" +
      "눈이… 텅 비어 있다.",
    choices: [
      {
        label: "fight_inf",
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

  /* ===== Solo psych ===== */
  solo_1: {
    bg: "./img/bg_solo.jpg",
    text:
      "혼자는 빠르고, 조용하고, 예측 가능하다.\n" +
      "그런데도 가끔—옆이 비어 있는 게 너무 크게 느껴졌다.",
    choices: [
      {
        label: "erase",
        variants: {
          base: "생각을 지운다",
          power: "지운다. 감정은 약점이다.",
          distance: "지운다. 어차피 혼자다.",
          broken: "지워… 지워…"
        },
        next: "after_encounter",
        delta: { loss: -1 }
      },
      {
        label: "memory",
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

  /* ===== Fight: 감염체 + 약탈자 ===== */
  fight_1: {
    bg: "./img/bg_fight.jpg",
    text:
      "골목 끝에 약탈자 둘.\n" +
      "그리고 그 뒤를 쫓아오는 감염체 하나.\n\n" +
      "서로를 이용하려는 눈빛.\n" +
      "이곳은 지옥이다.",
    choices: [
      {
        label: "push",
        variants: {
          base: "밀어붙인다",
          power: "밀어붙인다. 다 넘어뜨리고 지나간다.",
          distance: "틈만 보면 빠져나간다.",
          broken: "밀어… 다 끝내."
        },
        next: "after_encounter",
        delta: { power: 1, hp: -1, loss: 1 }
      },
      {
        label: "let_clash",
        variants: {
          base: "서로 싸우게 둔다 (틈새 이동)",
          power: "붙게 둔다. 최적의 순간만 친다.",
          distance: "붙게 둔다. 나는 조용히 빠진다.",
          broken: "싸워… 다 같이 망해."
        },
        next: "after_encounter",
        delta: { distance: 1 }
      }
    ]
  },

  /* ===== Companion route entry ===== */
  meet_survivors: {
    bg: "./img/bg_meet.jpg",
    text:
      "폐허 속에서 불빛이 흔들렸다.\n" +
      "사람이다. 살아 있는 사람.\n\n" +
      "상처투성이 눈빛이 나를 훑는다.\n" +
      "“혼자야?… 우리랑 같이 가.”",
    choices: [
      {
        label: "join",
        variants: {
          base: "…그래. 한 번만 더 믿어본다.",
          power: "좋아. 하지만 내 규칙대로 움직여.",
          distance: "가깝게는 안 돼. 그래도… 같이 가자.",
          broken: "…나도 사람 옆에 있어도 될까."
        },
        next: "party_rules",
        delta: { party: 2, trust: 2, loss: -1 }
      },
      {
        label: "refuse",
        variants: {
          base: "아니. 난 혼자가 편해.",
          power: "지금은 아니야. 짐은 늘어난다.",
          distance: "싫어. 엮이면 끝이야.",
          broken: "…미안. 못 해."
        },
        next: "after_encounter",
        delta: { distance: 1 }
      }
    ]
  },

  party_rules: {
    bg: "./img/bg_camp.jpg",
    text:
      "불 앞에서 서로의 손을 확인했다.\n" +
      "누구도 완전히 믿을 수는 없지만,\n" +
      "함께 가려면 규칙이 필요하다.",
    choices: [
      {
        label: "share",
        variants: {
          base: "식량을 나눈다 (신뢰↑, 식량↓)",
          power: "나눠. 대신 모두 책임져. (신뢰↑)",
          distance: "최소한만 나눠. (신뢰 소폭↑)",
          broken: "…그래, 나눠."
        },
        next: "party_event1",
        delta: { food: -1, trust: 2 }
      },
      {
        label: "keep",
        variants: {
          base: "식량은 각자 챙긴다 (신뢰↓)",
          power: "각자 챙겨. 흔들리면 죽는다. (신뢰↓)",
          distance: "엮이지 않는다. (신뢰↓)",
          broken: "…나한테도 남아야 해."
        },
        next: "party_event1",
        delta: { trust: -1 }
      }
    ]
  },

  party_event1: {
    bg: "./img/bg_party_street.jpg",
    text:
      "동행은 쉬운 길이 아니다.\n" +
      "소리도, 흔적도 커진다.\n\n" +
      "멀리서 감염체가 몰려오는 게 보인다.\n" +
      "그리고—골목 반대편엔 약탈자.",
    choices: [
      {
        label: "fight_together",
        variants: {
          base: "함께 싸워서 돌파한다",
          power: "내가 앞에 선다. 너희는 뒤를 지켜. (신뢰↑)",
          distance: "짧게 끝내고 바로 빠진다.",
          broken: "…다 끝내자."
        },
        next: "after_encounter",
        delta: { hp: -1, power: 1, trust: 1 }
      },
      {
        label: "sacrifice",
        variants: {
          base: "누군가를 미끼로 삼고 도망친다 (배드)",
          power: "살려면 결단이 필요해. (신뢰↓↓)",
          distance: "원래 혼자였어. (신뢰↓↓)",
          broken: "…미안."
        },
        next: "after_encounter",
        delta: { trust: -3, loss: 2 }
      }
    ]
  },

  /* ===== Day end hub: 하루 넘김(필수) ===== */
  after_encounter: {
    bg: "./img/bg_sunset.jpg",
    text:
      "해가 기울었다.\n" +
      "오늘도 살아남았다.\n\n" +
      "이제 남은 건—오늘을 ‘끝내는’ 일이다.",
    choices: [
      {
        label: "camp_sleep",
        variants: {
          base: "야영하고 하루를 넘긴다 (DAY +1)",
          power: "정비하고 야영한다. 내일은 더 강해진다. (DAY +1)",
          distance: "흔적을 지우고 야영한다. 들키지 않는다. (DAY +1)",
          broken: "…눈 감자. (DAY +1)"
        },
        next: "end_check",
        delta: { food: -1, day: 1 }
      }
    ]
  },

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
          power: "계속. 더 단단해진다.",
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
    choices: [] // 자동 분기
  },

  /* ====== ENDINGS (명칭 포함) ====== */
  end_guardian: {
    bg: "./img/bg_base.jpg",
    text:
      "🛡 「수호자가 된 사람」\n\n" +
      "나는 강해졌다.\n" +
      "지키는 건 두려웠지만—도망치지 않기로 했다.\n\n" +
      "누군가가 내 옆에 서도, 이번엔… 손을 놓지 않는다.",
    choices: [{ text: "처음부터", next: "prologue", delta: "RESET" }]
  },

  end_lonely: {
    bg: "./img/bg_road.jpg",
    text:
      "🧱 「아무도 두지 않은 생존자」\n\n" +
      "나는 끝까지 혼자였다.\n" +
      "아무도 잃지 않았다.\n\n" +
      "대신, 아무도 남지 않았다.",
    choices: [{ text: "처음부터", next: "prologue", delta: "RESET" }]
  },

  end_hollow: {
    bg: "./img/bg_room.jpg",
    text:
      "🕳 「텅 빈 껍데기」\n\n" +
      "살아남는 법은 배웠다.\n" +
      "하지만 살아가는 법은—배우지 못했다.",
    choices: [{ text: "처음부터", next: "prologue", delta: "RESET" }]
  },

  end_together: {
    bg: "./img/bg_together.jpg",
    text:
      "🤝 「끝까지 함께한 사람」\n\n" +
      "불완전한 사람들이었지만,\n" +
      "서로를 버리지 않기로 선택했다.\n\n" +
      "혼자였던 나는—다시 ‘우리’가 되었다.",
    choices: [{ text: "처음부터", next: "prologue", delta: "RESET" }]
  },

  end_lost_all: {
    bg: "./img/bg_lost_all.jpg",
    text:
      "🩸 「다시 모든 것을 잃은 자」\n\n" +
      "함께였기에 더 크게 잃었다.\n" +
      "한 번의 선택, 한 번의 실수,\n" +
      "한 번의 배신.\n\n" +
      "그리고 나는 다시 혼자가 됐다.",
    choices: [{ text: "처음부터", next: "prologue", delta: "RESET" }]
  },

  end_dead: {
    bg: "./img/bg_black.jpg",
    text:
      "☠ 「여기서 끝난 생존」\n\n" +
      "시야가 어두워졌다.\n" +
      "끝까지 버티지 못했다.",
    choices: [{ text: "처음부터", next: "prologue", delta: "RESET" }]
  },

  end_starve: {
    bg: "./img/bg_empty.jpg",
    text:
      "🍂 「굶주림에 삼켜진 사람」\n\n" +
      "배고픔은 통증이 아니라 공백이 되었다.\n" +
      "세상이 비어 있었다.",
    choices: [{ text: "처음부터", next: "prologue", delta: "RESET" }]
  },

  end_break: {
    bg: "./img/bg_rain.jpg",
    text:
      "🖤 「마음이 먼저 무너진 자」\n\n" +
      "마음이 먼저 무너졌다.\n" +
      "살아 있어도, 이미 끝난 것 같았다.",
    choices: [{ text: "처음부터", next: "prologue", delta: "RESET" }]
  }
};

/* -------------------------
   4) DOM
   (없어도 에러 안 나게 optional 처리)
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
const partyEl = document.getElementById("party");
const trustEl = document.getElementById("trust");

const toastLayer = document.getElementById("toastLayer"); // index.html에 추가해두면 뜸
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
  void el.offsetWidth;
  el.classList.add("bump");
}

/* -------------------------
   6) HUD / BG / Reset
------------------------- */
function updateHUD() {
  if (dayEl) dayEl.textContent = `📅 DAY ${state.day}`;
  if (hpEl) hpEl.textContent = `❤️ ${state.hp}`;
  if (foodEl) foodEl.textContent = `🍞 ${state.food}`;
  if (powerEl) powerEl.textContent = `🛡 ${state.power}`;
  if (distanceEl) distanceEl.textContent = `🧱 ${state.distance}`;
  if (lossEl) lossEl.textContent = `🖤 ${state.loss}`;
  if (partyEl) partyEl.textContent = `👥 ${state.party}`;
  if (trustEl) trustEl.textContent = `🤝 ${state.trust}`;
}

function setBackground(bgPath) {
  if (!gameEl) return;
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

  // 🤝 동행 엔딩
  if (state.party >= 2 && state.trust >= 7 && state.distance <= 7) return "end_together";
  if (state.party >= 2 && state.trust <= 1) return "end_lost_all";

  // 🛡 수호자
  if (state.power >= 6 && state.distance <= 4 && state.hp >= 3) return "end_guardian";

  // 🧱 고립
  if (state.distance >= 7) return "end_lonely";

  // 🕳 텅 빈 생존
  if (state.power >= 5 && state.loss >= 7) return "end_hollow";

  // 아직이면 계속 루프
  return "day_start";
}

/* -------------------------
   8) Render
------------------------- */
function render(sceneId) {
  if (sceneId === "resolve_end") {
    return render(resolveEndingFromState());
  }

  const scene = scenes[sceneId];
  if (!scene) return;

  setBackground(scene.bg);

  const rawText = scene.text ?? "";
  if (textEl) textEl.textContent = rawText.replaceAll("{day}", String(state.day));

  if (choicesEl) choicesEl.innerHTML = "";

  const available = (scene.choices || []).filter(c => meetsCond(state, c.cond));

  available.forEach(choice => {
    const btn = document.createElement("button");
    btn.className = "choice";
    btn.type = "button";
    btn.textContent = choiceText(choice, state);

    btn.addEventListener("click", () => {
      if (choice.delta === "RESET") {
        resetGame();
        return render(choice.next);
      }

      const before = { ...state };
      state = applyDelta(state, choice.delta);

      const diff = {
        day: state.day - before.day,
        hp: state.hp - before.hp,
        food: state.food - before.food,
        power: state.power - before.power,
        distance: state.distance - before.distance,
        loss: state.loss - before.loss,
        party: state.party - before.party,
        trust: state.trust - before.trust
      };

      // Auto endings
      const autoEnd = checkAutoEnding(state);

      updateHUD();

      // Toast (변한 것만)
      const parts = [];
      if (diff.day) parts.push(`+${diff.day} 📅`);
      if (diff.hp) parts.push(`${diff.hp > 0 ? "+" : ""}${diff.hp} ❤️`);
      if (diff.food) parts.push(`${diff.food > 0 ? "+" : ""}${diff.food} 🍞`);
      if (diff.power) parts.push(`${diff.power > 0 ? "+" : ""}${diff.power} 🛡`);
      if (diff.distance) parts.push(`${diff.distance > 0 ? "+" : ""}${diff.distance} 🧱`);
      if (diff.loss) parts.push(`${diff.loss > 0 ? "+" : ""}${diff.loss} 🖤`);
      if (diff.party) parts.push(`${diff.party > 0 ? "+" : ""}${diff.party} 👥`);
      if (diff.trust) parts.push(`${diff.trust > 0 ? "+" : ""}${diff.trust} 🤝`);

      if (parts.length) {
        const tone = parts.some(p => p.trim().startsWith("-")) ? "neg" : "pos";
        showToast(parts.join("   "), tone);
      }

      // bump changed HUD pills
      if (diff.day) bump(dayEl);
      if (diff.hp) bump(hpEl);
      if (diff.food) bump(foodEl);
      if (diff.power) bump(powerEl);
      if (diff.distance) bump(distanceEl);
      if (diff.loss) bump(lossEl);
      if (diff.party) bump(partyEl);
      if (diff.trust) bump(trustEl);

      if (autoEnd) return render(autoEnd);
      render(choice.next);
    });

    choicesEl.appendChild(btn);
  });

  // fallback 버튼
  if (available.length === 0 && choicesEl) {
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
