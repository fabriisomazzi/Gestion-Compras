const { createApp, ref, computed, onMounted } = Vue;

createApp({
    setup() {
        // Configuración inicial
        const categories = {
            'supermercado': { name: 'Supermercado', color: '#4CAF50' },
            'fruteria': { name: 'Fruteria', color: '#FF9800' },
            'carniceria': { name: 'Carnicería', color: '#F44336' },
            'otros': { name: 'Otros', color: '#9C27B0' }
        };

        const units = [
            { value: 'unidades', label: 'Unidades' },
            { value: 'kg', label: 'Kg' },
            { value: 'g', label: 'Gramos' },
            { value: 'l', label: 'Litros' },
            { value: 'ml', label: 'ml' },
            { value: 'paquete', label: 'Paquete' },
            { value: 'botella', label: 'Botella' },
            { value: 'lata', label: 'Lata' }
        ];

        // Refs
        const newItem = ref({
            name: '',
            category: 'supermercado',
            unit: 'unidades',

        });

        const items = ref([]);
        const searchQuery = ref('');
        const filterCategory = ref('');
        const errorMessage = ref('');
        const showModal = ref(false);
        const modalTitle = ref('');
        const modalMessage = ref('');
        const modalConfirmText = ref('');
        const modalAction = ref(null);
        const modalData = ref(null);
        const nameInput = ref(null);

        // Computed
        const isValidItem = computed(() => {
            return newItem.value.name.trim() !== '' && 
                   newItem.value.price > 0 && 
                   newItem.value.quantity > 0;
        });

        const hasFilters = computed(() => {
            return searchQuery.value !== '' || filterCategory.value !== '';
        });

        const filteredItems = computed(() => {
            return items.value.filter(item => {
                const matchesSearch = item.name.toLowerCase().includes(searchQuery.value.toLowerCase());
                const matchesCategory = filterCategory.value === '' || item.category === filterCategory.value;
                return matchesSearch && matchesCategory;
            });
        });

        const total = computed(() => {
            return filteredItems.value.reduce((sum, item) => sum + (item.quantity * item.price), 0);
        });

        const categoryTotals = computed(() => {
            const totals = {};
            filteredItems.value.forEach(item => {
                if (!totals[item.category]) {
                    totals[item.category] = 0;
                }
                totals[item.category] += item.quantity * item.price;
            });
            return totals;
        });

        // Métodos
        const loadItems = () => {
            const savedItems = localStorage.getItem('shoppingItems');
            if (savedItems) {
                items.value = JSON.parse(savedItems);
                
                // Migración para items antiguos sin ID
                items.value = items.value.map(item => {
                    if (!item.id) {
                        return { ...item, id: generateId() };
                    }
                    return item;
                });
            }
        };

        const saveItems = () => {
            localStorage.setItem('shoppingItems', JSON.stringify(items.value));
        };

        const generateId = () => {
            return Date.now().toString(36) + Math.random().toString(36).substring(2);
        };

        const addItem = () => {
            if (!isValidItem.value) {
                errorMessage.value = 'Por favor completa todos los campos correctamente';
                setTimeout(() => errorMessage.value = '', 3000);
                return;
            }

            const item = {
                ...newItem.value,
                id: generateId(),
                price: parseFloat(newItem.value.price),
                quantity: parseFloat(newItem.value.quantity),
                dateAdded: new Date().toISOString(),
                purchased: false
            };

            items.value.unshift(item);
            resetForm();
            saveItems();
            focusNameInput();
        };

        const editItem = (index) => {
            const item = filteredItems.value[index];
            newItem.value = { 
                name: item.name,
                category: item.category,
                quantity: item.quantity,
                unit: item.unit,
                price: item.price
            };
            
            // Eliminar el item editado
            items.value = items.value.filter(i => i.id !== item.id);
            focusNameInput();
        };

        const confirmDelete = (index) => {
            const item = filteredItems.value[index];
            showModal.value = true;
            modalTitle.value = 'Eliminar producto';
            modalMessage.value = `¿Estás seguro de que quieres eliminar "${item.name}"?`;
            modalConfirmText.value = 'Eliminar';
            modalAction.value = removeItem;
            modalData.value = index;
        };

        const removeItem = (index) => {
            const item = filteredItems.value[index];
            items.value = items.value.filter(i => i.id !== item.id);
            saveItems();
            hideModal();
        };

        const togglePurchased = (index) => {
            const item = filteredItems.value[index];
            const itemIndex = items.value.findIndex(i => i.id === item.id);
            items.value[itemIndex].purchased = !items.value[itemIndex].purchased;
            saveItems();
        };

        const clearList = () => {
            showModal.value = true;
            modalTitle.value = 'Limpiar lista';
            modalMessage.value = '¿Estás seguro de que quieres eliminar todos los productos?';
            modalConfirmText.value = 'Limpiar todo';
            modalAction.value = () => {
                items.value = [];
                saveItems();
                hideModal();
            };
        };

        const saveList = () => {
            const listName = prompt('Nombre para guardar esta lista:', `Lista de compras ${new Date().toLocaleDateString()}`);
            if (listName) {
                const lists = JSON.parse(localStorage.getItem('savedLists') || '[]');
                lists.push({
                    name: listName,
                    date: new Date().toISOString(),
                    items: items.value
                });
                localStorage.setItem('savedLists', JSON.stringify(lists));
                alert(`Lista "${listName}" guardada correctamente`);
            }
        };

        const exportList = () => {
            const data = {
                date: new Date().toISOString(),
                total: total.value,
                items: filteredItems.value
            };
            
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `lista-compras-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        };

        const printList = () => {
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <html>
                    <head>
                        <title>Lista de Compras</title>
                        <style>
                            body { font-family: Arial, sans-serif; padding: 20px; }
                            h1 { color: #3f51b5; }
                            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                            th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
                            th { background-color: #f5f5f5; }
                            .total { font-weight: bold; margin-top: 20px; }
                        </style>
                    </head>
                    <body>
                        <h1>Lista de Compras</h1>
                        <p>Fecha: ${new Date().toLocaleDateString()}</p>
                        <table>
                            <thead>
                                <tr>
                                    <th>Producto</th>
                                    <th>Cantidad</th>
                                    <th>Precio</th>
                                    <th>Total</th>
                                    <th>Categoría</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${filteredItems.value.map(item => `
                                    <tr>
                                        <td>${item.name}</td>
                                        <td>${formatQuantity(item.quantity)} ${getUnitLabel(item.unit)}</td>
                                        <td>${item.price.toFixed(2)} €</td>
                                        <td>${(item.quantity * item.price).toFixed(2)} €</td>
                                        <td>${categories[item.category].name}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                        <div class="total">
                            Total: ${total.value.toFixed(2)} €
                        </div>
                        <script>
                            window.onload = function() {
                                setTimeout(function() {
                                    window.print();
                                    window.close();
                                }, 200);
                            };
                        </script>
                    </body>
                </html>
            `);
            printWindow.document.close();
        };

        const addSampleData = () => {
            const sampleItems = [
                {
                    name: 'Pan Ciabatta',
                    category: 'supermercado',
                    quantity: 2,
                    unit: 'unidades',
                    price: 1.50,
                    id: generateId(),
                    dateAdded: new Date().toISOString()
                },
                {
                    name: 'Tomates',
                    category: 'fruteria',
                    quantity: 0.5,
                    unit: 'kg',
                    price: 2.80,
                    id: generateId(),
                    dateAdded: new Date().toISOString()
                },
                {
                    name: 'Pasta Penne',
                    category: 'supermercado',
                    quantity: 1,
                    unit: 'paquete',
                    price: 1.20,
                    id: generateId(),
                    dateAdded: new Date().toISOString()
                },
                {
                    name: 'Pollo',
                    category: 'carniceria',
                    quantity: 1.2,
                    unit: 'kg',
                    price: 6.50,
                    id: generateId(),
                    dateAdded: new Date().toISOString()
                },
                {
                    name: 'Vino Chianti',
                    category: 'otros',
                    quantity: 1,
                    unit: 'botella',
                    price: 8.90,
                    id: generateId(),
                    dateAdded: new Date().toISOString()
                }
            ];
            
            items.value = [...sampleItems, ...items.value];
            saveItems();
        };

        const clearFilters = () => {
            searchQuery.value = '';
            filterCategory.value = '';
        };

        const resetForm = () => {
            newItem.value = {
                name: '',
                category: 'supermercado',
                quantity: 1,
                unit: 'unidades',
                price: 0
            };
            errorMessage.value = '';
        };

        const focusNameInput = () => {
            if (nameInput.value) {
                nameInput.value.focus();
            }
        };

        const hideModal = () => {
            showModal.value = false;
            modalAction.value = null;
            modalData.value = null;
        };

        const confirmAction = () => {
            if (modalAction.value) {
                if (modalData.value !== null) {
                    modalAction.value(modalData.value);
                } else {
                    modalAction.value();
                }
            }
        };

        const cancelAction = () => {
            hideModal();
        };

        const formatQuantity = (quantity) => {
            return quantity % 1 === 0 ? quantity : quantity.toFixed(3).replace(/\.?0+$/, '');
        };

        const formatDate = (dateString) => {
            const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
            return new Date(dateString).toLocaleDateString('es-ES', options);
        };

        const getUnitLabel = (unitValue) => {
            const unit = units.find(u => u.value === unitValue);
            return unit ? unit.label : unitValue;
        };

        // Lifecycle hooks
        onMounted(() => {
            loadItems();
            focusNameInput();
        });

        // Exposición al template
        return {
            categories,
            units,
            newItem,
            items,
            searchQuery,
            filterCategory,
            errorMessage,
            showModal,
            modalTitle,
            modalMessage,
            modalConfirmText,
            isValidItem,
            hasFilters,
            filteredItems,
            total,
            categoryTotals,
            nameInput,
            addItem,
            editItem,
            removeItem,
            confirmDelete,
            togglePurchased,
            clearList,
            saveList,
            exportList,
            printList,
            addSampleData,
            clearFilters,
            confirmAction,
            cancelAction,
            formatQuantity,
            formatDate,
            getUnitLabel
        };
    }
}).mount('#app');