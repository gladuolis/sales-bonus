/**
 * Функция для расчета прибыли
 * @param purchase запись о покупке
 * @param _product карточка товараMore actions
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
    // @TODO: Расчет прибыли от операции
     // @TODO: Расчет прибыли от операции
     const { discount, sale_price, quantity } = purchase;
     return sale_price * quantity * (1 - (discount / 100));
 }
 
 /**
 @@ -17,6 +19,17 @@
  */
 function calculateBonusByProfit(index, total, seller) {
     // @TODO: Расчет бонуса от позиции в рейтинге
     const { profit } = seller;
 
     if (index === 0) {
         return +(profit * 0.15).toFixed(2);
     } else if (index === 1 || index === 2) {
         return +(profit * 0.10).toFixed(2);
     } else if (index === total - 1) {
         return 0;
     } else { // Для всех остальных
         return +(profit * 0.05).toFixed(2);
     }
 }
 
 /**
 @@ -27,18 +40,96 @@
  */
 function analyzeSalesData(data, options) {
     // @TODO: Проверка входных данных
     if (!data
         || !Array.isArray(data.sellers) || data.sellers.length === 0
         || !Array.isArray(data.products) || data.products.length === 0
         || !Array.isArray(data.purchase_records) || data.purchase_records.length === 0
     ) {
         throw new Error('Некорректные входные данные');
     }
 
     if (!typeof options === "object") {
         throw new Error('Переданный параметр опций не объект');
     }
     const { calculateRevenue, calculateBonus } = options;
     // @TODO: Проверка наличия опций
     if (!typeof calculateRevenue === "function" || !typeof calculateBonus === "function") {
         throw new Error('Переданные параметры опций не функции');
     }
 
     // @TODO: Подготовка промежуточных данных для сбора статистики
     const sellerStats = data.sellers.map(seller => ({
         id: seller.id,
         name: `${seller.first_name} ${seller.last_name}`,
         revenue: 0,
         profit: 0,
         sales_count: 0,
         products_sold: {}
     }));
 
     // @TODO: Индексация продавцов и товаров для быстрого доступа
     const sellerIndex = Object.fromEntries(data.sellers.map(item => [item.id, item]));
     const productIndex = Object.fromEntries(data.products.map(item => [item.sku, item]));
 
     // @TODO: Расчет выручки и прибыли для каждого продавца
     data.purchase_records.forEach(record => { // Чек 
         const seller = sellerIndex[record.seller_id]; // Продавец
 
         // Увеличить количество продаж 
         // Увеличить общую сумму всех продаж
         sellerStats.map(item => {
             if (item.id === seller.id) {
                 item.sales_count++;
                 item.revenue += +record.total_amount;
             }
         })
 
         // Расчёт прибыли для каждого товара
         record.items.forEach(item => {
             const product = productIndex[item.sku]; // Товар
             // Посчитать себестоимость (cost) товара как product.purchase_price, умноженную на количество товаров из чека
             const cost = product.purchase_price * item.quantity;
             // Посчитать выручку (revenue) с учётом скидки через функцию calculateSimpleRevenue
             const rev = calculateSimpleRevenue(item);
 
             // Посчитать прибыль: выручка минус себестоимость
             // Увеличить общую накопленную прибыль (profit) у продавца 
             sellerStats.map(value => {
                 if (value.id === seller.id) {
                     value.profit += rev - cost;
                     // Учёт количества проданных товаров
                     if (!value.products_sold[item.sku]) {
                         value.products_sold[item.sku] = 0;
                     }
                     // По артикулу товара увеличить его проданное количество у продавца
                     value.products_sold[item.sku]++;
                 }
             })
         });
     });
 
     // @TODO: Сортировка продавцов по прибыли
     sellerStats.sort((a, b) => (a.profit - b.profit) * -1);
 
     // @TODO: Назначение премий на основе ранжирования
     sellerStats.forEach((seller, index, arr) => {
         seller.bonus = calculateBonusByProfit(index, arr.length, seller);// Считаем бонус
         seller.top_products = Object.entries(seller.products_sold)
         .sort((a, b) => b[1] - a[1])
         .filter((item, index) => index < 10)
         .flatMap(item => {
             return { sku: item[0], quantity: item[1] }
         });// Формируем топ-10 товаров
     })
 
     // @TODO: Подготовка итоговой коллекции с нужными полями
 }
     return sellerStats.map(seller => ({
         seller_id: seller.id,// Строка, идентификатор продавца
         name: seller.name, // Строка, имя продавца
         revenue: +seller.revenue.toFixed(2), // Число с двумя знаками после точки, выручка продавца
         profit: +seller.profit.toFixed(2), // Число с двумя знаками после точки, прибыль продавца
         sales_count: seller.sales_count,// Целое число, количество продаж продавца
         top_products: seller.top_products, // Целое число, топ-10 товаров продавца
         bonus: seller.bonus, // Число с двумя знаками после точки, бонус продавца
     }));
 
   