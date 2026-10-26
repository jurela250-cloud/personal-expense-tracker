
const form = document.getElementById("expenseForm");
const titleInput = document.getElementById("title");
const amountInput = document.getElementById("amount");
const typeInput = document.getElementById("type");
const categoryInput = document.getElementById("category");
const dateInput = document.getElementById("date");

const balanceElement = document.getElementById("balance");
const incomeElement = document.getElementById("income");
const expensesElement = document.getElementById("expenses");
const transactionList = document.getElementById("transactionList");

const searchInput = document.getElementById("searchInput");
const filterType = document.getElementById("filterType");
const filterCategory = document.getElementById("filterCategory");

const budgetInput = document.getElementById("budgetAmount");
const saveBudgetButton = document.getElementById("saveBudget");

let transactions = JSON.parse(
    localStorage.getItem("transactions")
) || [];

let editingId = null;
let expenseChart = null;

const submitButton = form.querySelector('button[type="submit"]');

// Create Cancel Edit button automatically
const cancelEditButton = document.createElement("button");
cancelEditButton.type = "button";
cancelEditButton.textContent = "Cancel Edit";
cancelEditButton.style.display = "none";
submitButton.insertAdjacentElement("afterend", cancelEditButton);

// Set today's date
dateInput.value = new Date().toISOString().split("T")[0];

// Save transactions
function saveTransactions() {
    localStorage.setItem(
        "transactions",
        JSON.stringify(transactions)
    );
}

// Reset form and exit edit mode
function resetEditMode() {
    editingId = null;
    form.reset();

    dateInput.value = new Date().toISOString().split("T")[0];
    submitButton.textContent = "Add Transaction";
    cancelEditButton.style.display = "none";
}

// Add or update transaction
form.addEventListener("submit", function (event) {
    event.preventDefault();

    const title = titleInput.value.trim();
    const amount = Number(amountInput.value);
    const type = typeInput.value;
    const category = categoryInput.value;
    const date = dateInput.value;

    if (
        !title ||
        !Number.isFinite(amount) ||
        amount <= 0 ||
        !date
    ) {
        alert("Please enter valid transaction details.");
        return;
    }

    if (editingId !== null) {
        transactions = transactions.map(function (t) {
            if (t.id === editingId) {
                return {
                    ...t,
                    title: title,
                    amount: amount,
                    type: type,
                    category: category,
                    date: date
                };
            }

            return t;
        });
    } else {
        transactions.push({
            id: Date.now(),
            title: title,
            amount: amount,
            type: type,
            category: category,
            date: date
        });
    }

    saveTransactions();
    resetEditMode();
    displayTransactions();
    updateSummary();
});

// Cancel editing
cancelEditButton.addEventListener("click", function () {
    resetEditMode();
});

// Display transactions with search and filters
function displayTransactions() {
    transactionList.innerHTML = "";

    const searchText = searchInput.value.toLowerCase().trim();
    const selectedType = filterType.value;
    const selectedCategory = filterCategory.value;

    const filteredTransactions = transactions.filter(function (t) {
        const matchesSearch =
            t.title.toLowerCase().includes(searchText) ||
            t.category.toLowerCase().includes(searchText);

        const matchesType =
            selectedType === "all" || t.type === selectedType;

        const matchesCategory =
            selectedCategory === "all" ||
            t.category === selectedCategory;

        return matchesSearch && matchesType && matchesCategory;
    });

    if (filteredTransactions.length === 0) {
        transactionList.innerHTML =
            "<li>No matching transactions found.</li>";
        return;
    }

    filteredTransactions.forEach(function (transaction) {
        const li = document.createElement("li");
        const details = document.createElement("div");
        const name = document.createElement("strong");
        const info = document.createElement("small");
        const amount = document.createElement("span");
        const editButton = document.createElement("button");
        const deleteButton = document.createElement("button");

        name.textContent = transaction.title;
        info.textContent =
            `${transaction.category} | ${transaction.date}`;

        amount.textContent =
            `${transaction.type === "income" ? "+" : "-"}₹${transaction.amount.toFixed(2)}`;

        amount.style.color =
            transaction.type === "income" ? "green" : "red";

        editButton.textContent = "Edit";
        editButton.type = "button";

        editButton.addEventListener("click", function () {
            editingId = transaction.id;

            titleInput.value = transaction.title;
            amountInput.value = transaction.amount;
            typeInput.value = transaction.type;
            categoryInput.value = transaction.category;
            dateInput.value = transaction.date;

            submitButton.textContent = "Update Transaction";
            cancelEditButton.style.display = "inline-block";

            form.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });

            titleInput.focus();
        });

        deleteButton.textContent = "Delete";
        deleteButton.type = "button";

        deleteButton.addEventListener("click", function () {
            if (editingId === transaction.id) {
                resetEditMode();
            }

            transactions = transactions.filter(function (t) {
                return t.id !== transaction.id;
            });

            saveTransactions();
            displayTransactions();
            updateSummary();
        });

        details.append(
            name,
            document.createElement("br"),
            info
        );

        li.append(details, amount, editButton, deleteButton);
        transactionList.appendChild(li);
    });
}

// Search and filter events
searchInput.addEventListener("input", displayTransactions);
filterType.addEventListener("change", displayTransactions);
filterCategory.addEventListener("change", displayTransactions);

// Calculate income, expenses and balance
function updateSummary() {
    let totalIncome = 0;
    let totalExpenses = 0;

    transactions.forEach(function (t) {
        if (t.type === "income") {
            totalIncome += t.amount;
        } else {
            totalExpenses += t.amount;
        }
    });

    balanceElement.textContent =
        `₹${(totalIncome - totalExpenses).toFixed(2)}`;

    incomeElement.textContent = `₹${totalIncome.toFixed(2)}`;
    expensesElement.textContent = `₹${totalExpenses.toFixed(2)}`;

    updateBudget();
    updateExpenseChart();
}

// Monthly budget
let monthlyBudget = Number(
    localStorage.getItem("monthlyBudget")
) || 0;

budgetInput.value = monthlyBudget || "";

saveBudgetButton.addEventListener("click", function () {
    const amount = Number(budgetInput.value);

    if (!Number.isFinite(amount) || amount <= 0) {
        alert("Please enter a valid budget greater than zero.");
        return;
    }

    monthlyBudget = amount;
    localStorage.setItem("monthlyBudget", monthlyBudget);

    updateBudget();
});

function updateBudget() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthlyExpenseTotal = transactions
        .filter(function (t) {
            const transactionDate = new Date(t.date + "T00:00:00");

            return (
                t.type === "expense" &&
                transactionDate.getMonth() === currentMonth &&
                transactionDate.getFullYear() === currentYear
            );
        })
        .reduce(function (total, t) {
            return total + t.amount;
        }, 0);

    const remaining = monthlyBudget - monthlyExpenseTotal;

    document.getElementById("monthlyBudget").textContent =
        `₹${monthlyBudget.toFixed(2)}`;

    document.getElementById("monthlyExpenses").textContent =
        `₹${monthlyExpenseTotal.toFixed(2)}`;

    document.getElementById("remainingBudget").textContent =
        `₹${remaining.toFixed(2)}`;

    const message = document.getElementById("budgetMessage");

    if (monthlyBudget === 0) {
        message.textContent =
            "Set your monthly budget to get started.";
        message.style.color = "";
    } else if (remaining < 0) {
        message.textContent = "Warning: Monthly budget exceeded!";
        message.style.color = "red";
    } else {
        message.textContent =
            "You are within your monthly budget.";
        message.style.color = "green";
    }
}

// Category-wise expense chart
function updateExpenseChart() {
    const canvas = document.getElementById("expenseChart");

    if (!canvas || typeof Chart === "undefined") {
        return;
    }

    const categoryTotals = {};

    transactions.forEach(function (t) {
        if (t.type === "expense") {
            categoryTotals[t.category] =
                (categoryTotals[t.category] || 0) + t.amount;
        }
    });

    const labels = Object.keys(categoryTotals);
    const values = Object.values(categoryTotals);

    if (expenseChart) {
        expenseChart.destroy();
    }

    expenseChart = new Chart(canvas, {
        type: "doughnut",
        data: {
            labels: labels.length ? labels : ["No Expenses"],
            datasets: [{
                data: values.length ? values : [1],
                backgroundColor: labels.length
                    ? [
                        "#2563eb",
                        "#16a34a",
                        "#f59e0b",
                        "#dc2626",
                        "#9333ea",
                        "#0891b2"
                    ]
                    : ["#e2e8f0"]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: "bottom"
                }
            }
        }
    });
}

// Show saved data on page load
displayTransactions();
updateSummary();

const clearAllBtn = document.getElementById("clearAllBtn");

clearAllBtn.addEventListener("click", function () {
    if (transactions.length === 0) {
        alert("No transactions to clear.");
        return;
    }

    const confirmClear = confirm(
        "Are you sure you want to delete all transactions?"
    );

    if (confirmClear) {
        transactions = [];

        saveTransactions();
        resetEditMode();
        displayTransactions();
        updateSummary();
    }
});