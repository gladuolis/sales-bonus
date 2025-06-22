/**
 * Функция для расчета выручки от продажи
 * @param {Object} purchase - запись о покупке
 * @param {Object} _product - карточка товара (не используется)
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
    if (!purchase || typeof purchase !== 'object') {
        throw new Error('Некорректные данные покупки');
    }

    const { sale_price, quantity, discount } = purchase;
    if (sale_price === undefined || quantity === undefined || discount === undefined) {
        throw new Error('Отсутствуют обязательные поля в purchase');
    }

    return (sale_price * quantity) * (1 - discount / 100);
}

/**
 * Функция для расчета бонусов продавца
 * @param {number} index - порядковый номер в отсортированном массиве
 * @param {number} total - общее число продавцов
 * @param {Object} seller - карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
    if (index === 0) return seller.profit * 0.15;     // 15% для 1-го места
    if (index === 1 || index === 2) return seller.profit * 0.10; // 10% для 2-го и 3-го
    if (index === total - 1) return 0;                // 0% для последнего
    return seller.profit * 0.05;                      // 5% для остальных
}

/**
 * Функция для анализа данных продаж
 * @param {Object} data - входные данные
 * @param {Object} options - опции с функциями расчета
 * @returns {Array} - массив с результатами анализа
 */
function analyzeSalesData(data, options) {
    // Проверка входных данных
    if (!data || typeof data !== 'object') {
        throw new Error('Данные не переданы или не являются объектом');
    }

    const requiredArrays = ['sellers', 'products', 'purchase_records'];
    for (const arrayName of requiredArrays) {
        if (!Array.isArray(data[arrayName]) || data[arrayName].length === 0) {
            throw new Error(`Не хватает данных: ${arrayName} пуст или отсутствует`);
        }
    }

    // Проверка опций
    if (!options || typeof options !== 'object') {
        throw new Error('Опции не переданы или не являются объектом');
    }

    const { calculateSimpleRevenue, calculateBonusByProfit } = options;
    if (typeof calculateSimpleRevenue !== 'function' || typeof calculateBonusByProfit !== 'function') {
        throw new Error('В options должны быть функции calculateSimpleRevenue и calculateBonusByProfit');
    }

    // Создаем карточки продавцов
    const sellerStats = data.sellers.map(seller => ({
        seller_id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        revenue: 0,
        profit: 0,
        sales_count: 0,
        products_sold: {}
    }));

    // Создаем индекс товаров для быстрого доступа
    const productIndex = data.products.reduce((index, product) => {
        index[product.sku] = product;
        return index;
    }, {});

    // Обрабатываем все записи о покупках
    data.purchase_records.forEach(record => {
        const seller = sellerStats.find(s => s.seller_id === record.seller_id);
        if (!seller) return;

        seller.sales_count += 1;

        record.items.forEach(item => {
            const product = productIndex[item.sku];
            if (!product) return;

            const revenue = calculateSimpleRevenue(item, product);
            const cost = product.purchase_price * item.quantity;
            const profit = revenue - cost;

            seller.revenue += revenue;
            seller.profit += profit;

            // Учет проданных товаров
            seller.products_sold[item.sku] = (seller.products_sold[item.sku] || 0) + item.quantity;
        });
    });

    // Сортируем продавцов по убыванию прибыли
    sellerStats.sort((a, b) => b.profit - a.profit);

    // Назначаем бонусы
    sellerStats.forEach((seller, index) => {
        seller.bonus = calculateBonusByProfit(index, sellerStats.length, seller);
    });

    // Формируем итоговый результат
    return sellerStats.map(seller => ({
        seller_id: seller.seller_id,
        name: seller.name,
        revenue: +seller.revenue.toFixed(2),
        profit: +seller.profit.toFixed(2),
        sales_count: seller.sales_count,
        top_products: Object.entries(seller.products_sold)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([sku, quantity]) => ({ sku, quantity })),
        bonus: +seller.bonus.toFixed(2)
    }));
}