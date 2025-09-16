// Built on 2025-09-16T13:47:32.780Z
(function (global) {
  const MENU_JSON_PATH = "data/menu-data.json";
  const MENU_LABELS = {
    breakfast: "아침",
    lunch: "점심",
    dinner: "저녁",
  };
  const WEEK_DAYS = [
    "일요일",
    "월요일",
    "화요일",
    "수요일",
    "목요일",
    "금요일",
    "토요일",
  ];

  const dom = {
    dateInput: null,
    dateButton: null,
    dateLabel: null,
    updatedLabel: null,
    tableBody: null,
    message: null,
  };

  const state = {
    menuData: {},
    availableDates: [],
    generatedAt: "",
    selectedDate: null,
  };

  function cacheDom() {
    dom.dateInput = document.getElementById("menuDateInput");
    dom.dateButton = document.getElementById("menuDateButton");
    dom.dateLabel = document.getElementById("selectedDateLabel");
    dom.updatedLabel = document.getElementById("menuUpdatedAt");
    dom.tableBody = document.getElementById("menuTableBody");
    dom.message = document.getElementById("menuMessage");
  }

  function attachEvents() {
    if (dom.dateButton && dom.dateInput) {
      dom.dateButton.addEventListener("click", function () {
        if (typeof dom.dateInput.showPicker === "function") {
          dom.dateInput.showPicker();
        } else {
          dom.dateInput.focus();
        }
      });
    }

    if (dom.dateInput) {
      dom.dateInput.addEventListener("input", function (event) {
        updateSelectedDate(event.target.value);
      });
    }
  }

  function formatNumber(value) {
    return String(value).padStart(2, "0");
  }

  function formatDateKey(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
      return "";
    }
    return [
      date.getFullYear(),
      formatNumber(date.getMonth() + 1),
      formatNumber(date.getDate()),
    ].join("-");
  }

  function parseDateKey(dateKey) {
    if (!dateKey || typeof dateKey !== "string") {
      return null;
    }
    const [year, month, day] = dateKey.split("-").map(Number);
    if (
      Number.isNaN(year) ||
      Number.isNaN(month) ||
      Number.isNaN(day)
    ) {
      return null;
    }
    return new Date(year, month - 1, day);
  }

  function getDayName(date) {
    return WEEK_DAYS[date.getDay()];
  }

  function formatDateLabel(dateKey) {
    const date = parseDateKey(dateKey);
    if (!date) {
      return "선택한 날짜";
    }
    return (
      `${date.getFullYear()}년 ${formatNumber(date.getMonth() + 1)}월 ${formatNumber(
        date.getDate()
      )}일 (${getDayName(date)})`
    );
  }

  function formatKoreanTimestamp(timestamp) {
    if (!timestamp) {
      return "";
    }
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) {
      return "";
    }
    const formatted =
      `${date.getFullYear()}-${formatNumber(date.getMonth() + 1)}-${formatNumber(
        date.getDate()
      )} ${formatNumber(date.getHours())}:${formatNumber(date.getMinutes())}`;
    return `${formatted} 기준`;
  }

  function showMessage(text) {
    if (!dom.message) {
      return;
    }
    dom.message.textContent = text || "";
  }

  function renderEmptyTable(message) {
    if (!dom.tableBody) {
      return;
    }
    dom.tableBody.innerHTML = "";
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 2;
    cell.className = "menu-table__placeholder";
    cell.textContent = message || "급식 정보가 없습니다.";
    row.appendChild(cell);
    dom.tableBody.appendChild(row);
  }

  function renderMenu(dateKey) {
    if (!dom.tableBody) {
      return;
    }
    dom.tableBody.innerHTML = "";
    const menuForDate = state.menuData?.[dateKey];

    if (!menuForDate) {
      renderEmptyTable("선택한 날짜의 급식 정보가 없습니다.");
      showMessage("교육정보개방포털에서 제공하지 않은 날짜입니다.");
      return;
    }

    Object.keys(MENU_LABELS).forEach(function (mealType) {
      const row = document.createElement("tr");
      const mealCell = document.createElement("th");
      mealCell.scope = "row";
      mealCell.textContent = MENU_LABELS[mealType];

      const menuCell = document.createElement("td");
      const dishes = Array.isArray(menuForDate[mealType])
        ? menuForDate[mealType]
        : [];

      const list = document.createElement("ul");
      if (dishes.length === 0) {
        const li = document.createElement("li");
        li.textContent = "등록된 메뉴가 없습니다.";
        list.appendChild(li);
      } else {
        dishes.forEach(function (dish) {
          const li = document.createElement("li");
          li.textContent = dish;
          list.appendChild(li);
        });
      }
      menuCell.appendChild(list);

      row.appendChild(mealCell);
      row.appendChild(menuCell);
      dom.tableBody.appendChild(row);
    });

    showMessage("선택한 날짜의 급식 정보를 확인했습니다.");
  }

  function updateSelectedDate(dateKey) {
    if (!dateKey) {
      return;
    }
    state.selectedDate = dateKey;

    if (dom.dateInput && dom.dateInput.value !== dateKey) {
      dom.dateInput.value = dateKey;
    }

    if (dom.dateLabel) {
      dom.dateLabel.textContent = formatDateLabel(dateKey);
    }

    renderMenu(dateKey);
  }

  async function loadMenuData() {
    const response = await fetch(MENU_JSON_PATH, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch menu data: ${response.status}`);
    }

    return response.json();
  }

  function callbackFunc(callback, args) {
    if (!callback) {
      return;
    }

    if (typeof callback === "function") {
      callback.apply(null, args);
      return;
    }

    if (typeof global !== "undefined" && typeof global[callback] === "function") {
      global[callback].apply(global, args);
      return;
    }

    console.warn("Callback not found:", callback);
  }

  function setMealInfoUi(params) {
    const result = params?.res;
    const menus = result?.menus || {};
    state.menuData = menus;
    state.availableDates = result?.availableDates || Object.keys(menus).sort();
    state.generatedAt = result?.generatedAt || "";

    if (!state.availableDates.length) {
      renderEmptyTable();
      showMessage(
        "교육정보개방포털에서 비공개된 자료로 급식정보가 없습니다."
      );
      return;
    }

    if (dom.updatedLabel) {
      dom.updatedLabel.textContent = state.generatedAt
        ? formatKoreanTimestamp(state.generatedAt)
        : "";
    }

    if (dom.dateInput) {
      dom.dateInput.min = state.availableDates[0];
      dom.dateInput.max = state.availableDates[state.availableDates.length - 1];
    }

    const todayKey = formatDateKey(new Date());
    const initialDate = state.availableDates.includes(todayKey)
      ? todayKey
      : state.availableDates[0];

    updateSelectedDate(initialDate);
  }

  async function requestApiMealInfo(
    schulCode,
    atptOfcdcScCode,
    sdSchulCode,
    callback
  ) {
    try {
      const data = await loadMenuData();
      const menus = data?.menus || {};
      const availableDates = Object.keys(menus).sort();
      const payload = {
        schulCode: schulCode || "",
        mlsvFromYmd: availableDates[0]?.replace(/-/g, "") || "",
        mlsvToYmd: availableDates[availableDates.length - 1]?.replace(/-/g, "") || "",
        res: {
          menus,
          availableDates,
          generatedAt: data?.generatedAt || "",
        },
      };

      callbackFunc(callback, [payload]);
      return payload;
    } catch (error) {
      console.error("급식 데이터를 불러오지 못했습니다.", error);
      renderEmptyTable("급식 정보를 불러오는 중 오류가 발생했습니다.");
      showMessage("급식 정보를 불러오는 중 오류가 발생했습니다.");
      return null;
    }
  }

  function initialize() {
    cacheDom();
    attachEvents();
    requestApiMealInfo("T10", "9296071", "0000000", "setMealInfoUi");
  }

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", initialize);
  }

  if (typeof module !== "undefined" && module.exports) {
    const fs = require("fs");
    const path = require("path");

    const SAMPLE_BREAKFAST = [
      ["현미밥", "소고기미역국", "계란말이", "배추김치"],
      ["잡곡밥", "북어해장국", "닭살야채볶음", "열무김치"],
      ["김치볶음밥", "유부된장국", "떡갈비", "깍두기"],
      ["참치마요주먹밥", "맑은콩나물국", "소시지구이", "김자반"],
      ["수제머핀", "그릭요거트", "계절과일", "아몬드"],
    ];

    const SAMPLE_LUNCH = [
      ["흑미밥", "된장찌개", "제육볶음", "시금치나물", "배추김치"],
      ["보리밥", "순두부찌개", "고등어구이", "콩나물무침", "열무김치"],
      ["차조밥", "떡국", "닭강정", "치커리사과무침", "깍두기"],
      ["곤드레밥", "사골우거지국", "갈치조림", "연근조림", "총각김치"],
      ["카레라이스", "팽이버섯장국", "야채튀김", "양배추샐러드", "깍두기"],
    ];

    const SAMPLE_DINNER = [
      ["발아현미밥", "어묵탕", "불고기", "유채겉절이", "포기김치"],
      ["기장밥", "감자수제비", "꿔바로우", "부추무침", "백김치"],
      ["곤약볶음밥", "차돌된장국", "버섯불고기", "무생채", "김치"],
      ["나시고랭", "맑은시래기국", "훈제오리무침", "겉절이", "열무김치"],
      ["콩나물비빔밥", "미소장국", "연어스테이크", "어린잎샐러드", "깍두기"],
    ];

    function buildMenuData(pastDays, futureDays) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const menus = {};
      for (let offset = -pastDays; offset <= futureDays; offset += 1) {
        const date = new Date(today);
        date.setDate(today.getDate() + offset);
        const dateKey = formatDateKey(date);
        menus[dateKey] = {
          breakfast: SAMPLE_BREAKFAST[(offset + SAMPLE_BREAKFAST.length) % SAMPLE_BREAKFAST.length],
          lunch: SAMPLE_LUNCH[(offset + SAMPLE_LUNCH.length) % SAMPLE_LUNCH.length],
          dinner: SAMPLE_DINNER[(offset + SAMPLE_DINNER.length) % SAMPLE_DINNER.length],
        };
      }
      return menus;
    }

    function generateMenuData(options) {
      const settings = Object.assign(
        {
          pastDays: 3,
          futureDays: 10,
          outputPath: path.join(__dirname, "data", "menu-data.json"),
        },
        options || {}
      );

      const menus = buildMenuData(settings.pastDays, settings.futureDays);
      const payload = {
        generatedAt: new Date().toISOString(),
        menus,
      };

      fs.mkdirSync(path.dirname(settings.outputPath), { recursive: true });
      fs.writeFileSync(
        settings.outputPath,
        `${JSON.stringify(payload, null, 2)}\n`,
        "utf8"
      );
      return payload;
    }

    module.exports = {
      generateMenuData,
    };

    if (require.main === module) {
      const args = process.argv.slice(2);
      if (args.includes("--generate")) {
        const outputIndex = args.findIndex((arg) => arg === "--out");
        const outputPath =
          outputIndex !== -1 && args[outputIndex + 1]
            ? path.resolve(process.cwd(), args[outputIndex + 1])
            : undefined;
        const options = outputPath ? { outputPath } : undefined;
        generateMenuData(options);
        console.log("급식 데이터 JSON 파일을 생성했습니다.");
      }
    }
  }

  global.requestApiMealInfo = requestApiMealInfo;
  global.setMealInfoUi = setMealInfoUi;
})(typeof window !== "undefined" ? window : globalThis);
