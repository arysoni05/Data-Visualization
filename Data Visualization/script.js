const subjectList = ["Hindi", "English", "Maths", "Science", "SST"];
let chartInstances = [];

document.addEventListener("DOMContentLoaded", initDashboard);

async function initDashboard() {
  showLoader();
  updateDate();

  try {
    const students = await loadCSV();
    if (!students.length) {
      throw new Error("CSV file is empty.");
    }

    renderCards(students);
    renderCharts(students);
    hideLoader();
    showDashboard();
  } catch (error) {
    console.error(error);
    hideLoader();
    showError();
  }
}

function showLoader() {
  document.getElementById("loader").classList.remove("hidden");
  document.getElementById("dashboard-content").classList.add("hidden");
  document.getElementById("error-state").classList.add("hidden");
}

function hideLoader() {
  document.getElementById("loader").classList.add("hidden");
}

function showDashboard() {
  document.getElementById("dashboard-content").classList.remove("hidden");
}

function showError() {
  document.getElementById("error-state").classList.remove("hidden");
}

function updateDate() {
  const now = new Date();
  const formatted = now.toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });
  document.getElementById("currentDate").textContent = formatted;
}

async function loadCSV() {
  const response = await fetch("./students.csv");

  if (!response.ok) {
    throw new Error("Could not load students.csv");
  }

  const text = await response.text();
  return parseCSV(text);
}

function parseCSV(text) {
  const rows = text.trim().split(/\r?\n/).filter(Boolean);
  const headers = rows[0].split(",").map((header) => header.trim());

  return rows.slice(1).map((row) => {
    const values = row.split(",").map((value) => value.trim());
    const student = {};

    headers.forEach((header, index) => {
      const value = values[index];
      if (subjectList.includes(header)) {
        student[header] = Number(value);
      } else if (header === "RollNo") {
        student[header] = Number(value);
      } else {
        student[header] = value;
      }
    });

    student.totalMarks = subjectList.reduce((sum, subject) => sum + student[subject], 0);
    student.percentage = (student.totalMarks / (subjectList.length * 100)) * 100;
    return student;
  });
}

function renderCards(students) {
  const totalStudents = students.length;
  const averagePercentage = calculateAverage(students).overallAverage;
  const topper = [...students].sort((a, b) => b.percentage - a.percentage)[0];
  const passFail = calculatePassFail(students);

  document.getElementById("totalStudents").textContent = totalStudents;
  document.getElementById("averagePercentage").textContent = `${averagePercentage.toFixed(1)}%`;
  document.getElementById("topperPercentage").textContent = `${topper.percentage.toFixed(1)}%`;
  document.getElementById("passPercentage").textContent = `${passFail.passPercentage.toFixed(1)}%`;
}

function calculateAverage(students) {
  const averages = {};
  let total = 0;

  subjectList.forEach((subject) => {
    const sum = students.reduce((accumulator, student) => accumulator + student[subject], 0);
    averages[subject] = sum / students.length;
  });

  students.forEach((student) => {
    total += student.percentage;
  });

  return {
    subjectAverages: averages,
    overallAverage: total / students.length
  };
}

function calculatePassFail(students) {
  let passCount = 0;

  students.forEach((student) => {
    const passed = subjectList.every((subject) => student[subject] >= 33);
    if (passed) {
      passCount += 1;
    }
  });

  const failCount = students.length - passCount;

  return {
    passCount,
    failCount,
    passPercentage: (passCount / students.length) * 100,
    failPercentage: (failCount / students.length) * 100
  };
}

function calculateTopStudents(students) {
  return [...students]
    .sort((a, b) => b.totalMarks - a.totalMarks)
    .slice(0, 10)
    .map((student) => ({
      name: student.StudentName,
      marks: student.totalMarks,
      percentage: student.percentage
    }));
}

function calculateDistribution(students) {
  const ranges = [
    { label: "90-100", min: 90, max: 100 },
    { label: "80-89", min: 80, max: 89 },
    { label: "70-79", min: 70, max: 79 },
    { label: "60-69", min: 60, max: 69 },
    { label: "Below 60", min: 0, max: 59 }
  ];

  return ranges.map((range) => {
    const count = students.filter((student) => {
      const percentage = student.percentage;
      return percentage >= range.min && percentage <= range.max;
    }).length;

    return {
      label: range.label,
      count,
      percentage: (count / students.length) * 100
    };
  });
}

function calculateSubjectDifficulty(students) {
  const averages = calculateAverage(students).subjectAverages;

  return Object.entries(averages)
    .map(([subject, average]) => ({ subject, average }))
    .sort((a, b) => a.average - b.average);
}

function calculateHighestMarks(students) {
  return subjectList.map((subject) => {
    const highest = Math.max(...students.map((student) => student[subject]));
    return { subject, highest };
  });
}

function renderCharts(students) {
  destroyCharts();

  const averages = calculateAverage(students);
  const passFail = calculatePassFail(students);
  const topStudents = calculateTopStudents(students);
  const distribution = calculateDistribution(students);
  const difficulty = calculateSubjectDifficulty(students);
  const highestMarks = calculateHighestMarks(students);

  createBarChart(
    "subjectsChart",
    Object.keys(averages.subjectAverages),
    Object.values(averages.subjectAverages),
    "Average Marks",
    ["#5b7cff", "#7c3aed", "#38bdf8", "#f59e0b", "#fb7185"]
  );

  createPieChart(
    "passChart",
    ["Pass", "Fail"],
    [passFail.passCount, passFail.failCount],
    ["#5b7cff", "#f43f5e"]
  );

  createHorizontalBarChart(
    "topStudentsChart",
    topStudents.map((student) => student.name),
    topStudents.map((student) => student.marks),
    "Total Marks"
  );

  createBarChart(
    "distributionChart",
    distribution.map((item) => item.label),
    distribution.map((item) => item.percentage),
    "Percentage of Students",
    ["#5b7cff", "#7c3aed", "#38bdf8", "#f59e0b", "#fb7185"]
  );

  createBarChart(
    "difficultyChart",
    difficulty.map((item) => item.subject),
    difficulty.map((item) => item.average),
    "Average Marks",
    ["#fb7185", "#f59e0b", "#38bdf8", "#7c3aed", "#5b7cff"]
  );

  createBarChart(
    "highestMarksChart",
    highestMarks.map((item) => item.subject),
    highestMarks.map((item) => item.highest),
    "Highest Marks",
    ["#5b7cff", "#8b5cf6", "#38bdf8", "#f59e0b", "#fb7185"]
  );
}

function createBarChart(canvasId, labels, data, label, colors) {
  const ctx = document.getElementById(canvasId).getContext("2d");
  chartInstances.push(
    new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label,
            data,
            backgroundColor: colors,
            borderRadius: 12,
            borderSkipped: false
          }
        ]
      },
      options: getChartOptions()
    })
  );
}

function createPieChart(canvasId, labels, data, colors) {
  const ctx = document.getElementById(canvasId).getContext("2d");
  chartInstances.push(
    new Chart(ctx, {
      type: "doughnut",
      data: {
        labels,
        datasets: [
          {
            data,
            backgroundColor: colors,
            borderWidth: 2,
            borderColor: "#0f172a"
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: {
              color: "#e2e8f0"
            }
          }
        }
      }
    })
  );
}

function createHorizontalBarChart(canvasId, labels, data, label) {
  const ctx = document.getElementById(canvasId).getContext("2d");
  chartInstances.push(
    new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label,
            data,
            backgroundColor: ["#5b7cff", "#7c3aed", "#38bdf8", "#f59e0b", "#fb7185", "#6366f1", "#14b8a6", "#f43f5e", "#a78bfa", "#22c55e"],
            borderRadius: 10,
            borderSkipped: false
          }
        ]
      },
      options: {
        ...getChartOptions(),
        indexAxis: "y"
      }
    })
  );
}

function getChartOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: "#e2e8f0"
        }
      }
    },
    scales: {
      x: {
        ticks: {
          color: "#cbd5e1"
        },
        grid: {
          color: "rgba(255,255,255,0.08)"
        }
      },
      y: {
        ticks: {
          color: "#cbd5e1"
        },
        grid: {
          color: "rgba(255,255,255,0.08)"
        },
        beginAtZero: true
      }
    }
  };
}

function destroyCharts() {
  chartInstances.forEach((chart) => chart.destroy());
  chartInstances = [];
}
