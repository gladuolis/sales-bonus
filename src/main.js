/**
 * Функция для расчета выручки от продажи
 * @param {Object} purchase - запись о покупке
 * @param {Object} _product - карточка товара (не используется)
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
    const { sale_price, quantity, discount } = purchase;
    return sale_price * quantity * (1 - discount / 100);
}

/**
 * Функция для расчета бонусов продавца
 * @param {number} index - порядковый номер в рейтинге
 * @param {number} total - общее количество продавцов
 * @param {Object} seller - объект продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
    if (index === 0) return seller.profit * 0.15;
    if (index === 1 || index === 2) return seller.profit * 0.10;
    if (index === total - 1) return 0;
    return seller.profit * 0.05;
}

/**
 * Функция для анализа данных продаж
 * @param {Object} data - входные данные
 * @param {Object} options - объект с функциями расчета
 * @returns {Array}
 */
function analyzeSalesData(data, options) {
    // Проверка входных данных
    if (!data || typeof data !== 'object' ||
        !Array.isArray(data.sellers) || data.sellers.length === 0 ||
        !Array.isArray(data.products) || data.products.length === 0 ||
        !Array.isArray(data.purchase_records) || data.purchase_records.length === 0) {
        throw new Error('Некорректные входные данные');
    }}

    // Проверка опций
    if (!options || typeof options !== 'object') {
        throw new Error('Опции должны быть объектом');
    }

    const { calculateRevenue, calculateBonus } = options;
    if (typeof calculateRevenue !== 'function' || typeof calculateBonus !== 'function') {
        throw new Error('Неверные функции расчета');
    }

    // Подготовка данных
    const sellerStats = {};
    data.sellers.forEach(seller => {
        sellerStats[seller.id] = {
            seller_id: seller.id,
            name: `${seller.first_name} ${seller.last_name}`,
            revenue: 0,
            profit: 0,
            sales_count: 0,
            products_sold: {}
        };
    });

    // Создание индекса товаров
    const productIndex = {};
    data.products.forEach(product => {
        productIndex[product.sku] = product;
    });

    // Обработка записей о покупках
    data.purchase_records.forEach(record => {
        const seller = sellerStats[record.seller_id];
        if (!seller) return;

        seller.sales_count += 1;

        record.items.forEach(item => {
            const product = productIndex[item.sku];
            if (!product) return;

            // Точный расчет с промежуточным округлением
            const itemRevenue = parseFloat((item.sale_price * item.quantity * (1 - item.discount / 100)).toFixed(2));
            const itemCost = parseFloat((product.purchase_price * item.quantity).toFixed(2));
            const itemProfit = parseFloat((itemRevenue - itemCost).toFixed(2));

            seller.revenue = parseFloat((parseFloat(seller.revenue) + parseFloat(itemRevenue)).toFixed(2));
            seller.profit = parseFloat((parseFloat(seller.profit) + parseFloat(itemProfit)).toFixed(2));

            // Учет проданных товаров
            seller.products_sold[item.sku] = (seller.products_sold[item.sku] || 0) + item.quantity;
        });
    });

    // Преобразование и сортировка
    const sortedSellers = Object.values(sellerStats).sort((a, b) => 
        parseFloat(b.profit) - parseFloat(a.profit))
   