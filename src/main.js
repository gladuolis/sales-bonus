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
 * @param {number} index - порядковый номер в рейтинге
 * @param {number} total - общее количество продавцов
 * @param {Object} seller - объект продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
    if (index === 0) return seller.profit * 0.15;     // 1 место - 15%
    if (index === 1 || index === 2) return seller.profit * 0.10; // 2-3 места - 10%
    if (index === total - 1) return 0;                // Последнее место - 0%
    return seller.profit * 0.05;                      // Остальные - 5%
}

/**
 * Функция для анализа данных продаж
 * @param {Object} data - входные данные
 * @param {Object} options - объект с функциями расчета
 * @returns {Array}
 */
function analyzeSalesData(data, options) {
    // Проверка входных данных
    if (!data || typeof data !== 'object') {
        throw new Error('Данные не переданы или не являются объектом');
    }

    if (!Array.isArray(data.sellers) || data.sellers.length === 0 ||
        !Array.isArray(data.products) || data.products.length === 0 ||
        !Array.isArray(data.purchase_records) || data.purchase_records.length === 0) {
        throw new Error('Не хватает данных: sellers, products или purchase_records пусты или отсутствуют');
    }

    // Проверка опций
    if (!options || typeof options !== 'object') {
        throw new Error('Опции не переданы или не являются объектом');
    }

    const { calculateRevenue, calculateBonus } = options;
    if (typeof calculateRevenue !== 'function' || typeof calculateBonus !== 'function') {
        throw new Error('В options должны быть функции calculateRevenue и calculateBonus');
    }

    // Подготовка данных
    const sellerStats = data.sellers.map(seller => ({
        seller_id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        revenue: 0,
        profit: 0,
        sales_count: 0,
        products_sold: {}
    }));

    // Создание индексов для быстрого доступа
    const productIndex = data.products.reduce((acc, product) => {
        acc[product.sku] = product;
        return acc;
    }, {});

    // Обработка записей о покупках
    data.purchase_records.forEach(record => {
        const seller = sellerStats.find(s => s.seller_id === record.seller_id);
        if (!seller) return;

        seller.sales_count += 1;

        record.items.forEach(item => {
            const product = productIndex[item.sku];
            if (!product) return;

            const revenue = calculateRevenue(item, product);
            const cost = product.purchase_price * item.quantity;
            const profit = revenue - cost;

            seller.revenue += revenue;
            seller.profit += profit;

            seller.products_sold[item.sku] = (seller.products_sold[item.sku] || 0) + item.quantity;
        });
    });

    // Сортировка по убыванию прибыли
    sellerStats.sort((a, b) => b.profit - a.profit);

    // Расчет бонусов
    sellerStats.forEach((seller, index) => {
        seller.bonus = calculateBonus(index, sellerStats.length, seller);
    });

    // Формирование результата
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

// Экспорт функций для тестов
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        calculateSimpleRevenue,
        calculateBonusByProfit,
        analyzeSalesData
    };
}