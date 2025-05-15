document.getElementById("transfer-function-form").addEventListener("submit", async function (e) {
    e.preventDefault();

    const funcInput = document.getElementById("tf").value;
    const errorDiv = document.getElementById("error");
    const graphsDiv = document.getElementById("graphs");
    const formulaDiv = document.getElementById("formula");
    const loadingDiv = document.getElementById("loading");

    errorDiv.textContent = "";
    graphsDiv.innerHTML = "";
    formulaDiv.innerHTML = "";
    loadingDiv.style.display = "block";

    if (!isValidTransferFunction(funcInput)) {
        errorDiv.textContent = "Ошибка! Введите функцию в формате: (s+3)/(s^2+4s+5)";
        loadingDiv.style.display = "none";
        return;
    }

    // Показываем формулу (LaTeX)
    const latex = convertToLatex(funcInput);
    formulaDiv.innerHTML = `\\[ W(s) = ${latex} \\]`;
    if (window.MathJax) MathJax.typesetPromise();
    const API_URL = "https://go-graphs-api.onrender.com/api/compute";

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ function: funcInput })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error("Ошибка сервера: " + errorText);
        }

        const data = await response.json();
        console.log("Полученные данные:", data); // Для отладки
        
        // Обработка нулей и полюсов (они могут быть строкой)
        const zerosText = typeof data.zeros === 'string' ? data.zeros : 
                        (Array.isArray(data.zeros) ? data.zeros.join(", ") : "Нет данных");
        const polesText = typeof data.poles === 'string' ? data.poles : 
                        (Array.isArray(data.poles) ? data.poles.join(", ") : "Нет данных");

        // Добавляем информацию об устойчивости системы
        const stabilityText = data.is_stable ? 
            `<span style="color: green;">Система устойчива</span>` : 
            `<span style="color: red;">Система неустойчива</span>`;

        // Создаем карту графиков и их описаний
        const graphMap = {
            "bode": {
                title: "Частотная характеристика (Боде)",
                description: `${stabilityText}<br>Запас устойчивости: ${data.stability_margin || 'Нет данных'}°`
            },
            "step_response": {
                title: "Переходная характеристика",
                description: `Время переходного процесса: ${data.settling_time || 'Нет данных'} сек<br>
                             Перерегулирование: ${data.overshoot || 'Нет данных'}%`
            },
            "impulse_response": {
                title: "Импульсная характеристика",
                description: ""
            },
            "nyquist_plot": {
                title: "Годограф Найквиста",
                description: ""
            },
            "mikhailov_plot": {
                title: "Годограф Михайлова",
                description: ""
            },
            "poles_zeros": {
                title: "Нули и полюса",
                description: `Нули: ${zerosText}<br>Полюса: ${polesText}`
            }
        };

        // Порядок отображения графиков
        const displayOrder = [
            "bode",
            "step_response",
            "impulse_response",
            "nyquist_plot",
            "mikhailov_plot",
            "poles_zeros"
        ];

        // Создаем графики в указанном порядке
        displayOrder.forEach(key => {
            if (data[key]) {
                const graphInfo = graphMap[key];
                const block = document.createElement("div");
                block.className = "graph-block";

                block.innerHTML = `
                    <div class="graph-title">${graphInfo.title}</div>
                    <img src="${data[key]}" alt="${key}" loading="lazy">
                    <div class="graph-data">${graphInfo.description}</div>
                `;
                
                graphsDiv.appendChild(block);
            }
        });

    } catch (error) {
        console.error("Ошибка:", error);
        errorDiv.textContent = "Произошла ошибка при обработке запроса. Проверьте консоль для подробностей.";
    } finally {
        loadingDiv.style.display = "none";
    }
});

// Функции проверки и преобразования остаются без изменений
function isValidTransferFunction(input) {
    const regex = /^\(.*\)\/\(.*\)$/;
    return regex.test(input.trim());
}

function convertToLatex(expr) {
    return expr
        .replace(/\*/g, '')
        .replace(/s\^(\d+)/g, 's^{$1}')
        .replace(/\(/g, '\\left(')
        .replace(/\)/g, '\\right)')
        .replace(',', '.')
        .replace('/', '}{')
        .replace(/^/, '\\frac{') + '}';
}