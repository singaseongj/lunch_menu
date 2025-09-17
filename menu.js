(function (global) {
  const MENU_JSON_PATH = "data/menu-data.json";
  const MEAL_SERVICE_API_URL = "https://open.neis.go.kr/hub/mealServiceDietInfo";
  const SCHOOL_INFO = {
    educationOfficeCode: "G10",
    schoolCode: "7430295",
    name: "대전동신과학고등학교",
  };
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
    dom.dateButton = document.querySelector(
      ".menu-card__date-picker .calendar-button"
    );
    dom.dateLabel = document.getElementById("selectedDateLabel");
    dom.updatedLabel = document.getElementById("menuUpdatedAt");
    dom.tableBody = document.getElementById("menuTableBody");
    dom.message = document.getElementById("menuMessage");
  }

  function attachEvents() {
    if (dom.dateInput) {
      // 더 안정적인 이벤트 처리
      dom.dateInput.addEventListener("change", (e) => {
        updateSelectedDate(e.target.value);
      });

      dom.dateInput.addEventListener("input", (e) => {
        updateSelectedDate(e.target.value);
      });
    }

    // showPicker() 관련 코드 제거하고 단순화
    if (dom.dateButton) {
      dom.dateButton.addEventListener("click", () => {
        if (dom.dateInput) {
          dom.dateInput.focus();
          dom.dateInput.click();
        }
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
    schulCode = SCHOOL_INFO.schoolCode,
    atptOfcdcScCode = SCHOOL_INFO.educationOfficeCode,
    sdSchulCode = SCHOOL_INFO.schoolCode,
    callback
  ) {
    try {
      const data = await loadMenuData();
      const menus = data?.menus || {};
      const availableDates = Object.keys(menus).sort();
      const payload = {
        schulCode: schulCode || "",
        atptOfcdcScCode: atptOfcdcScCode || "",
        sdSchulCode: sdSchulCode || "",
        schoolName: SCHOOL_INFO.name,
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
    requestApiMealInfo(
      SCHOOL_INFO.schoolCode,
      SCHOOL_INFO.educationOfficeCode,
      SCHOOL_INFO.schoolCode,
      "setMealInfoUi"
    );
  }

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", initialize);
  }

  if (typeof module !== "undefined" && module.exports) {
    const fs = require("fs");
    const path = require("path");

    const MEAL_TYPE_MAP = {
      "1": "breakfast",
      "2": "lunch",
      "3": "dinner",
    };

    function formatDateForApi(date) {
      if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
        throw new Error("Invalid date provided for NEIS API request.");
      }

      return (
        `${date.getFullYear()}${formatNumber(date.getMonth() + 1)}${formatNumber(
          date.getDate()
        )}`
      );
    }

    function convertYmdToDateKey(value) {
      if (typeof value !== "string" || value.length !== 8) {
        return "";
      }

      return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
    }

    function decodeHtmlEntities(text) {
      if (typeof text !== "string") {
        return "";
      }

      return text
        .replace(/&amp;/gi, "&")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'");
    }

    function parseDishList(dishText) {
      if (!dishText || typeof dishText !== "string") {
        return [];
      }

      return dishText
        .split(/<br\s*\/?>/i)
        .map((item) => decodeHtmlEntities(item))
        .map((item) => item.replace(/\(\d+(?:\.\d+)*\)/g, "").trim())
        .filter(Boolean);
    }

    function transformRowsToMenus(rows) {
      return rows.reduce((accumulator, row) => {
        const dateKey = convertYmdToDateKey(row?.MLSV_YMD);
        const mealType = MEAL_TYPE_MAP[String(row?.MMEAL_SC_CODE)];

        if (!dateKey || !mealType) {
          return accumulator;
        }

        if (!accumulator[dateKey]) {
          accumulator[dateKey] = {
            breakfast: [],
            lunch: [],
            dinner: [],
          };
        }

        accumulator[dateKey][mealType] = parseDishList(row?.DDISH_NM);
        return accumulator;
      }, {});
    }

    async function fetchMealRowsFromApi(apiKey, fromYmd, toYmd, pageSize) {
      if (!apiKey) {
        throw new Error("MENU_API environment variable is required to fetch meal data.");
      }

      if (!fromYmd || !toYmd) {
        throw new Error("Both from and to dates are required to fetch meal data.");
      }

      const params = new URLSearchParams({
        KEY: apiKey,
        Type: "json",
        pIndex: "1",
        pSize: String(Math.max(1, Number(pageSize) || 100)),
        ATPT_OFCDC_SC_CODE: SCHOOL_INFO.educationOfficeCode,
        SD_SCHUL_CODE: SCHOOL_INFO.schoolCode,
        MLSV_FROM_YMD: fromYmd,
        MLSV_TO_YMD: toYmd,
      });

      const response = await fetch(`${MEAL_SERVICE_API_URL}?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`NEIS API request failed with status ${response.status}`);
      }

      const payload = await response.json();
      const service = Array.isArray(payload?.mealServiceDietInfo)
        ? payload.mealServiceDietInfo
        : null;

      if (!service) {
        const message =
          payload?.RESULT?.MESSAGE || "Unexpected response structure from NEIS API.";
        throw new Error(message);
      }

      const headEntries = Array.isArray(service[0]?.head) ? service[0].head : [];
      const resultInfo = headEntries
        .map((entry) => entry?.RESULT)
        .find((entry) => entry);
      const resultCode = resultInfo?.CODE || payload?.RESULT?.CODE;
      const resultMessage = resultInfo?.MESSAGE || payload?.RESULT?.MESSAGE;

      if (resultCode && !["INFO-000", "INFO-200"].includes(resultCode)) {
        throw new Error(`NEIS API error ${resultCode}: ${resultMessage || "Unknown error."}`);
      }

      const rows = Array.isArray(service[1]?.row) ? service[1].row : [];

      if (!rows.length && resultCode === "INFO-200") {
        return [];
      }

      return rows;
    }

    async function generateMenuData(options) {
      const settings = Object.assign(
        {
          pastDays: 3,
          futureDays: 10,
          pageSize: 100,
          outputPath: path.join(__dirname, "data", "menu-data.json"),
          apiKey: process.env.MENU_API,
        },
        options || {}
      );

      const pastDays = Math.max(0, Number(settings.pastDays) || 0);
      const futureDays = Math.max(0, Number(settings.futureDays) || 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const fromDate = new Date(today);
      fromDate.setDate(today.getDate() - pastDays);

      const toDate = new Date(today);
      toDate.setDate(today.getDate() + futureDays);

      const fromYmd = formatDateForApi(fromDate);
      const toYmd = formatDateForApi(toDate);

      const rows = await fetchMealRowsFromApi(
        settings.apiKey,
        fromYmd,
        toYmd,
        settings.pageSize
      );

      const menus = transformRowsToMenus(rows);
      const payload = {
        generatedAt: new Date().toISOString(),
        menus,
        school: {
          name: SCHOOL_INFO.name,
          educationOfficeCode: SCHOOL_INFO.educationOfficeCode,
          schoolCode: SCHOOL_INFO.schoolCode,
        },
        dateRange: {
          from: fromYmd,
          to: toYmd,
        },
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

        generateMenuData(options)
          .then(() => {
            console.log("급식 데이터 JSON 파일을 생성했습니다.");
          })
          .catch((error) => {
            console.error("급식 데이터를 생성하는 중 오류가 발생했습니다.", error);
            process.exitCode = 1;
          });
      }
    }
  }

  global.requestApiMealInfo = requestApiMealInfo;
  global.setMealInfoUi = setMealInfoUi;
})(typeof window !== "undefined" ? window : globalThis);
