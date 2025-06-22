function analyzeSalesData(data, options) {
    // Проверка входных данных
    if (!data || typeof data !== 'object') {
        throw new Error('Данные не переданы или не являются объектом');
    }

    const requiredArrays = ['sellers', 'products', 'purchase_records'];
    for (const arrayName of requiredArrays) {
        if (!Array.isArray(data[arrayName])) {
            throw new Error(`Не хватает данных: ${arrayName} должен быть массивом`);
        }
        if (data[arrayName].length === 0) {
            throw new Error(`Не хватает данных: ${arrayName} не должен быть пустым`);
        }
    }

    // Проверка опций
    if (!options || typeof options !== 'object') {
        throw new Error('Опции не переданы или не являются объектом');
    }

    // Ключевое изменение - получаем функции напрямую
    const calculateRevenue = options.calculateSimpleRevenue;
    const calculateBonus = options.calculateBonusByProfit;

    if (typeof calculateRevenue !== 'function' || typeof calculateBonus !== 'function') {
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

    // Создаем индекс товаров
    const productIndex = data.products.reduce((index, product) => {
        index[product.sku] = product;
        return index;
    }, {});

    // Обрабатываем покупки
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

    // Сортируем по прибыли
    sellerStats.sort((a, b) => b.profit - a.profit);

    // Назначаем бонусы
    sellerStats.forEach((seller, index) => {
        seller.bonus = calculateBonus(index, sellerStats.length, seller);
    });

    // Формируем результат
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