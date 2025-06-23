/**
 * Функция для расчета выручки от продажи
 * @param {Object} purchase - запись о покупке
 * @param {Object} _product - карточка товара (не используется)
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
    const { sale_price, quantity, discount } = purchase;
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
    if (!data ||
        !Array.isArray(data.sellers) || !data.sellers.length ||
        !Array.isArray(data.products) || !data.products.length ||
        !Array.isArray(data.purchase_records)) {
        throw new Error('Некорректные входные данные');
    }

    // Проверка опций
    if (!options || typeof options !== 'object') {
        throw new Error('Опции должны быть объектом');
    }

    const { calculateRevenue, calculateBonus } = options;
    if (typeof calculateRevenue !== 'function' || typeof calculateBonus !== 'function') {
        throw new Error('Неверные функции расчета');
    }

    // Подготовка статистики по продавцам
    const sellerStatsMap = new Map();
    data.sellers.forEach(seller => {
        sellerStatsMap.set(seller.id, {
            seller_id: seller.id,
            name: `${seller.first_name} ${seller.last_name}`,
            revenue: 0,
            profit: 0,
            sales_count: 0,
            products_sold: new Map()
        });
    });

    // Создание индекса товаров
    const productMap = new Map();
    data.products.forEach(product => {
        productMap.set(product.sku, product);
    });

    // Обработка записей о покупках
    data.purchase_records.forEach(record => {
        const sellerStat = sellerStatsMap.get(record.seller_id);
        if (!sellerStat) return;

        sellerStat.sales_count += 1;

        record.items.forEach(item => {
            const product = productMap.get(item.sku);
            if (!product) return;

            // Расчет выручки и прибыли
            const revenue = calculateRevenue(item, product);
            const cost = product.purchase_price * item.quantity;
            const profit = revenue - cost;

            sellerStat.revenue += revenue;
            sellerStat.profit += profit;

            // Учет проданных товаров
            const currentQuantity = sellerStat.products_sold.get(item.sku) || 0;
            sellerStat.products_sold.set(item.sku, currentQuantity + item.quantity);
        });
    });

    // Сортировка продавцов по прибыли
    const sortedSellers = Array.from(sellerStatsMap.values()).sort((a, b) => b.profit - a.profit);

    // Расчет бонусов и формирование результата
    return sortedSellers.map((seller, index, array) => {
        // Формирование топ-10 товаров
        const topProducts = Array.from(seller.products_sold.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([sku, quantity]) => ({ sku, quantity }));

        return {
            seller_id: seller.seller_id,
            name: seller.name,
            revenue: parseFloat(seller.revenue.toFixed(2)),
            profit: parseFloat(seller.profit.toFixed(2)),
            sales_count: seller.sales_count,
            top_products: topProducts,
            bonus: parseFloat(calculateBonus(index, array.length, seller).toFixed(2))
        };
    });
}