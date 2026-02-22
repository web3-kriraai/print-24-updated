import axios from 'axios';
(async () => {
    try {
        const fetchRes = await axios.get('http://localhost:5000/api/products');
        const products = fetchRes.data;
        if (!products.length) return console.log("No products");
        const pId = products[0]._id;

        console.log("Updating product:", pId);
        await axios.put(`http://localhost:5000/api/admin/products/${pId}`, {
            productionTimeRanges: '[{"minQuantity":1,"maxQuantity":1000,"days":1,"hours":10}]'
        });

        console.log("Testing estimation...");
        const estRes = await axios.post('http://localhost:5000/api/shipping/estimate', {
            pincode: '400001',
            productId: pId,
            quantity: 500,
            strategy: 'balanced'
        });
        console.log("Est Res:", estRes.data);
    } catch (e) {
        console.error(e.response?.data || e.message);
    }
})();
