/**
 * Функция для расчета выручки от продажи
 * @param purchase запись о покупке
 * @param _product карточка товара
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

    const result = (sale_price * quantity) * (1 - discount / 100);
    return result;
}

/**
 * Функция для расчета бонусов продавца
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
    if (index === 0) {
        return seller.profit * 0.15; // 15% для 1-го места
    } else if (index === 1 || index === 2) {
        return seller.profit * 0.10; // 10% для 2-го и 3-го
    } else if (index === total - 1) {
        return 0; // 0% для последнего
    } else {
        return seller.profit * 0.05; // 5% для остальных
    }
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
    // Проверка входных данных
    if (!data || typeof data !== 'object') {
        throw new Error('Данные не переданы или не являются объектом'); 
    }

    if (
        !Array.isArray(data.sellers) || data.sellers.length === 0 ||
        !Array.isArray(data.products) || data.products.length === 0 ||
        !Array.isArray(data.purchase_records) || data.purchase_records.length === 0
    ) {
        throw new Error('Не хватает данных: sellers, products или purchase_records пусты или отсутствуют');
    }

    // Проверка наличия опций
    if (!options || typeof options !== 'object') {
        throw new Error('Опции не переданы или не являются объектом');
    }

    const { calculateSimpleRevenue, calculateBonusByProfit } = options;

    if (typeof calculateSimpleRevenue !== 'function' || typeof calculateBonusByProfit !== 'function') {
        throw new Error('В options должны быть функции calculateSimpleRevenue и calculateBonusByProfit');
    }

    // Подготовка промежуточных данных
    const sellerStats = data.sellers.map(seller => ({
        seller_id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        revenue: 0,
        profit: 0,
        sales_count: 0,
        products_sold: {}
    }));

    // Индексация для быстрого доступа
    const productIndex = data.products.reduce((acc, product) => {
        acc[product.sku] = product;
        return acc;
    }, {});

    // Расчет выручки и прибыли
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
    
            seller.products_sold[item.sku] = (seller.products_sold[item.sku] || 0) + item.quantity;
        });
    });

    // Сортировка продавцов по прибыли
    sellerStats.sort((a, b) => b.profit - a.profit);

    // Назначение премий
    sellerStats.forEach((seller, index) => {
        seller.bonus = calculateBonusByProfit(index, sellerStats.length, seller);
    });

    // Подготовка итоговой коллекции
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