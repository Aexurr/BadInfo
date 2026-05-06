let winrateChart;

export function renderWinrate(win) {
  const ctx = document.getElementById("winrate-chart");
  if (!ctx) return;

  if (winrateChart) winrateChart.destroy();

  winrateChart = new Chart(ctx.getContext("2d"), {
    type: "bar",
    data: {
      labels: ["Wins", "Losses"],
      datasets: [{
        data: [win.wins, win.losses],
        backgroundColor: ["#2ecc71", "#e74c3c"],
        borderRadius: 6,
        borderSkipped: false,
        barThickness: 60
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => {
              const total = win.wins + win.losses;
              const pct = total > 0 ? Math.round((ctx.raw / total) * 100) : 0;
              return ` ${ctx.raw} games (${pct}%)`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { font: { size: 13, weight: "700" } }
        },
        y: {
          beginAtZero: true,
          max: Math.max(win.wins, win.losses, 1) + 2,
          grid: { color: "rgba(0,0,0,0.05)" },
          ticks: { stepSize: 1, font: { size: 11 } }
        }
      }
    }
  });
}
