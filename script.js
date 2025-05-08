const { createApp, ref, computed } = Vue;

createApp({
    setup() {
        const newItem = ref({
            name: '',
            category: 'supermercado',
            quantity: 1,
            unit: 'unidades',
            price: 0
        });

        const items = ref(JSON.parse(localStorage.getItem('shoppingItems')) || []);

        const addItem = () => {
            if (!newItem.value.name || newItem.value.price <= 0) return;
            
            items.value.push({
                ...newItem.value,
                price: parseFloat(newItem.value.price),
                quantity: parseFloat(newItem.value.quantity)
            });
            
            // Reset form
            newItem.value = {
                name: '',
                category: 'supermercado',
                quantity: 1,
                unit: 'unidades',
                price: 0
            };
            
            saveToLocalStorage();
        };

        const removeItem = (index) => {
            items.value.splice(index, 1);
            saveToLocalStorage();
        };

        const editItem = (index) => {
            const item = items.value[index];
            newItem.value = { ...item };
            removeItem(index);
        };

        const saveToLocalStorage = () => {
            localStorage.setItem('shoppingItems', JSON.stringify(items.value));
        };

        const total = computed(() => {
            return items.value.reduce((sum, item) => sum + (item.quantity * item.price), 0);
        });

        const categoryTotals = computed(() => {
            const totals = {};
            items.value.forEach(item => {
                if (!totals[item.category]) {
                    totals[item.category] = 0;
                }
                totals[item.category] += item.quantity * item.price;
            });
            return totals;
        });

        const getCategoryName = (category) => {
            const names = {
                'supermercado': 'Supermercado',
                'fruteria': 'Fruteria',
                'carniceria': 'Carnicería',
                'otros': 'Otros'
            };
            return names[category] || category;
        };

        return {
            newItem,
            items,
            addItem,
            removeItem,
            editItem,
            total,
            categoryTotals,
            getCategoryName
        };
    }
}).mount('#app');