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
    
    const API_URL = "https://control-system-mtxi.onrender.com/api/compute";
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
        console.log("Полученные данные:", data);
        
        // Обработка данных
        const zerosText = typeof data.zeros === 'string' ? data.zeros : 
                        (Array.isArray(data.zeros) ? data.zeros.join(", ") : "Нет данных");
        const polesText = typeof data.poles === 'string' ? data.poles : 
                        (Array.isArray(data.poles) ? data.poles.join(", ") : "Нет данных");

        const stabilityText = data.is_stable ? 
            `<span style="color: green;">Система устойчива</span>` : 
            `<span style="color: red;">Система неустойчива</span>`;

        // Полный пересмотр обработки изображений
        const handleImageData = (imgData) => {
            if (!imgData) return null;
            
            // Если это уже data URL
            if (imgData.startsWith('data:image/')) {
                return imgData;
            }
            
            // Если это base64 без префикса
            if (/^[A-Za-z0-9+/=]+$/.test(imgData)) {
                return `data:image/png;base64,${imgData}`;
            }
            
            // Если это URL (относительный или абсолютный)
            if (imgData.startsWith('/') || imgData.startsWith('http')) {
                return new URL(imgData, API_URL).href;
            }
            
            return null;
        };

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

        const displayOrder = [
            "bode",
            "step_response",
            "impulse_response",
            "nyquist_plot",
            "mikhailov_plot",
            "poles_zeros"
        ];

        displayOrder.forEach(key => {
            if (data[key]) {
                const graphInfo = graphMap[key];
                const block = document.createElement("div");
                block.className = "graph-block";

                const imageSrc = handleImageData(data[key]);
                
                if (imageSrc) {
                    block.innerHTML = `
                        <div class="graph-title">${graphInfo.title}</div>
                        <img src="${imageSrc}" alt="${key}" loading="lazy">
                        <div class="graph-data">${graphInfo.description}</div>
                    `;
                    graphsDiv.appendChild(block);
                } else {
                    console.warn(`Неверный формат данных для графика: ${key}`, data[key]);
                }
            }
        });

    } catch (error) {
        console.error("Ошибка:", error);
        errorDiv.textContent = "Произошла ошибка при обработке запроса. Проверьте консоль для подробностей.";
    } finally {
        loadingDiv.style.display = "none";
    }
});

// Остальные функции без изменений
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