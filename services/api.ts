const API_URL =
    (import.meta as any).env.VITE_API_URL ||
    "https://lumetrya-server-334812937330.europe-west1.run.app";

// 1. Проверка связи
export async function healthCheck() {
    try {
        const res = await fetch(`${API_URL}/api/health`);
        if (!res.ok) throw new Error('Server unreachable');
        return res.json();
    } catch (err) {
        console.error("Health check failed:", err);
        throw err;
    }
}

// 2. Получение всех данных пользователя
export async function fetchUserData() {
    try {
        const res = await fetch(`${API_URL}/api/user-data`); // Убедитесь, что этот эндпоинт есть на бэкенде
        if (!res.ok) return null;
        return res.json();
    } catch (err) {
        console.error("Error fetching data:", err);
        return null;
    }
}

// 3. Сохранение/Обновление всех данных
export async function updateUserData(userData: any) {
    try {
        const res = await fetch(`${API_URL}/api/user-data`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData),
        });
        return res.json();
    } catch (err) {
        console.error("Error saving data:", err);
        throw err;
    }
}