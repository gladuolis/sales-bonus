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
function analyzeSalesData(data, options = {}) {
    // Проверка входных данных
    if (!data || 
        !Array.isArray(data.sellers) || data.sellers.length === 0 ||
        !Array.isArray(data.products) || data.products.length === 0 ||
        !Array.isArray(data.purchase_records) || data.purchase_records.length === 0) {
        throw new Error('Некорректные входные данные');
    }

    // Проверка опций
    const { 
        calculateRevenue = calculateSimpleRevenue, 
        calculateBonus = calculateBonusByProfit 
    } = options;
    
    if (typeof calculateRevenue !== 'function' || typeof calculateBonus !== 'function') {
        throw new Error('Неверные функции расчета');
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
    const sellerIndex = sellerStats.reduce((acc, seller) => {
        acc[seller.seller_id] = seller;
        return acc;
    }, {});

    const productIndex = data.products.reduce((acc, product) => {
        acc[product.sku] = product;
        return acc;
    }, {});

    // Обработка записей о покупках
    data.purchase_records.forEach(record => {
        const seller = sellerIndex[record.seller_id];
        if (!seller) {
            throw new Error(`Продавец с id ${record.seller_id} не найден`);
        }

        seller.sales_count += 1;
        seller.revenue += record.total_amount - record.total_discount;

        record.items.forEach(item => {
            const product = productIndex[item.sku];
            if (!product) {
                throw new Error(`Товар с sku ${item.sku} не найден`);
            }

            const revenue = calculateRevenue(item, product);
            const cost = product.purchase_price * item.quantity;
            const profit = revenue - cost;

            seller.profit += profit;

            if (!seller.products_sold[item.sku]) {
                seller.products_sold[item.sku] = 0;
            }
            seller.products_sold[item.sku] += item.quantity;
        });
    });

    // Сортировка по убыванию прибыли
    const sortedSellers = [...sellerStats].sort((a, b) => b.profit - a.profit);

    // Расчет бонусов и формирование результата
    return sortedSellers.map((seller, index) => {
        const topProducts = Object.entries(seller.products_sold)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([sku, quantity]) => ({ sku, quantity }));

        return {
            seller_id: seller.seller_id,
            name: seller.name,
            revenue: +seller.revenue.toFixed(2),
            profit: +seller.profit.toFixed(2),
            sales_count: seller.sales_count,
            top_products: topProducts,
            bonus: +calculateBonus(index, sortedSellers.length, seller).toFixed(2)
        };
    });
}

// Экспорт функций для тестов
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        calculateSimpleRevenue,
        calculateBonusByProfit,
        analyzeSalesData
    };
}