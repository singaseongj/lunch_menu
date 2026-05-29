(function () {
  const VOTING_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbyWF5Dx2ARrUYMx45P1z28r0-e7yuTa54LaVyRmcuYBY0l5AoFM2vWs2drouC81tMMY/exec";

  const dom = {
    body: null,
    message: null,
    updatedAt: null,
    refreshButton: null,
  };

  function cacheDom() {
    dom.body = document.getElementById("voteResultsBody");
    dom.message = document.getElementById("voteResultsMessage");
    dom.updatedAt = document.getElementById("voteResultsUpdatedAt");
    dom.refreshButton = document.getElementById("refreshVoteResults");
  }

  function showMessage(text) {
    if (dom.message) {
      dom.message.textContent = text || "";
    }
  }

  function formatNumber(value) {
    const number = Number(value);
    if (Number.isNaN(number)) {
      return "0";
    }
    return number.toFixed(1).replace(/\.0$/, "");
  }

  function formatTimestamp(date) {
    const safeDate = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(safeDate.getTime())) {
      return "";
    }

    return `${safeDate.getFullYear()}-${String(safeDate.getMonth() + 1).padStart(2, "0")}-${String(safeDate.getDate()).padStart(2, "0")} ${String(safeDate.getHours()).padStart(2, "0")}:${String(safeDate.getMinutes()).padStart(2, "0")} 기준`;
  }

  function renderPlaceholder(message) {
    if (!dom.body) {
      return;
    }

    dom.body.innerHTML = "";
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 3;
    cell.className = "menu-table__placeholder";
    cell.textContent = message;
    row.appendChild(cell);
    dom.body.appendChild(row);
  }

  function normalizeResults(payload) {
    const source = payload?.results || payload?.items || payload?.votes || payload?.data || payload;

    if (Array.isArray(source)) {
      return source.map((item) => ({
        food: item.name || item.food || item.foodName || item.menu || "이름 없는 메뉴",
        average: Number(item.averageRating ?? item.average ?? item.avg ?? item.rating ?? item.score ?? 0),
        count: Number(item.voteCount ?? item.count ?? item.votes ?? item.total ?? 0),
      }));
    }

    if (source && typeof source === "object") {
      return Object.entries(source).map(([food, value]) => {
        if (typeof value === "number") {
          return { food, average: value, count: 0 };
        }

        return {
          food: value?.name || value?.food || value?.foodName || food,
          average: Number(value?.averageRating ?? value?.average ?? value?.avg ?? value?.rating ?? value?.score ?? 0),
          count: Number(value?.voteCount ?? value?.count ?? value?.votes ?? value?.total ?? 0),
        };
      });
    }

    return [];
  }

  function renderResults(results) {
    if (!dom.body) {
      return;
    }

    dom.body.innerHTML = "";

    if (!results.length) {
      renderPlaceholder("아직 등록된 투표 결과가 없습니다.");
      return;
    }

    results
      .sort((a, b) => b.average - a.average || b.count - a.count || a.food.localeCompare(b.food, "ko"))
      .forEach((result) => {
        const row = document.createElement("tr");
        const foodCell = document.createElement("th");
        const ratingCell = document.createElement("td");
        const countCell = document.createElement("td");
        const average = Number.isFinite(result.average) ? Math.max(0, Math.min(5, result.average)) : 0;

        foodCell.scope = "row";
        foodCell.textContent = result.food;
        ratingCell.innerHTML = `<span class="vote-result-stars" aria-label="평균 ${formatNumber(average)}점">${"★".repeat(Math.round(average))}${"☆".repeat(5 - Math.round(average))}</span> <strong>${formatNumber(average)}</strong>`;
        countCell.textContent = result.count ? `${result.count}표` : "-";

        row.appendChild(foodCell);
        row.appendChild(ratingCell);
        row.appendChild(countCell);
        dom.body.appendChild(row);
      });
  }

  async function loadVoteResults() {
    renderPlaceholder("투표 결과를 불러오는 중입니다.");
    showMessage("");

    if (dom.refreshButton) {
      dom.refreshButton.disabled = true;
    }

    try {
      const response = await fetch(VOTING_WEB_APP_URL, { cache: "no-store" });

      if (!response.ok) {
        throw new Error(`Vote results request failed: ${response.status}`);
      }

      const payload = await response.json();
      renderResults(normalizeResults(payload));

      if (dom.updatedAt) {
        dom.updatedAt.textContent = formatTimestamp(payload?.updatedAt || payload?.generatedAt || new Date());
      }
      showMessage("투표 결과를 불러왔습니다.");
    } catch (error) {
      console.error("투표 결과를 불러오지 못했습니다.", error);
      renderPlaceholder("투표 결과를 불러오지 못했습니다.");
      showMessage("잠시 후 다시 시도해 주세요.");
    } finally {
      if (dom.refreshButton) {
        dom.refreshButton.disabled = false;
      }
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    cacheDom();
    if (dom.refreshButton) {
      dom.refreshButton.addEventListener("click", loadVoteResults);
    }
    loadVoteResults();
  });
})();
