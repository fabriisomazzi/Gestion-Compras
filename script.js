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
        const activeTab = ref('planned');
        const newItem = ref({
            name: '',
            category: 'supermercado',
            unit: 'unidades',
        });
        
        const unplannedItem = ref({
            name: '',
            category: 'supermercado',
            unit: 'unidades',
        });

        const plannedItems = ref([]);
        const purchasedItems = ref([]);
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
        
        // Modal de precios
        const showPriceModal = ref(false);
        const priceModalItem = ref(null);
        const priceModalIndex = ref(null);

        // Computed
        const isValidPlannedItem = computed(() => {
            return newItem.value.name.trim() !== '' && 
                   newItem.value.estimatedPrice > 0 && 
                   newItem.value.quantity > 0;
        });
        
        const isValidUnplannedItem = computed(() => {
            return unplannedItem.value.name.trim() !== '' && 
                   unplannedItem.value.actualPrice > 0 && 
                   unplannedItem.value.quantity > 0;
        });

        const hasFilters = computed(() => {
            return searchQuery.value !== '' || filterCategory.value !== '';
        });

        const filteredPlannedItems = computed(() => {
            return plannedItems.value.filter(item => {
                const matchesSearch = item.name.toLowerCase().includes(searchQuery.value.toLowerCase());
                const matchesCategory = filterCategory.value === '' || item.category === filterCategory.value;
                return matchesSearch && matchesCategory;
            });
        });
        
        const filteredPurchasedItems = computed(() => {
            return purchasedItems.value.filter(item => {
                const matchesSearch = item.name.toLowerCase().includes(searchQuery.value.toLowerCase());
                const matchesCategory = filterCategory.value === '' || item.category === filterCategory.value;
                return matchesSearch && matchesCategory;
            });
        });
        
        const currentItems = computed(() => {
            return activeTab.value === 'planned' ? filteredPlannedItems.value : filteredPurchasedItems.value;
        });
        
        const currentTotal = computed(() => {
            return currentItems.value.reduce((sum, item) => {
                const price = activeTab.value === 'planned' ? item.estimatedPrice : item.actualPrice;
                return sum + (item.quantity * price);
            }, 0);
        });
        
        const currentCategoryTotals = computed(() => {
            const totals = {};
            currentItems.value.forEach(item => {
                const price = activeTab.value === 'planned' ? item.estimatedPrice : item.actualPrice;
                if (!totals[item.category]) {
                    totals[item.category] = 0;
                }
                totals[item.category] += item.quantity * price;
            });
            return totals;
        });

        // Métodos
        const loadItems = () => {
            const savedPlanned = localStorage.getItem('shoppingPlannedItems');
            const savedPurchased = localStorage.getItem('shoppingPurchasedItems');
            
            if (savedPlanned) {
                plannedItems.value = JSON.parse(savedPlanned).map(item => {
                    if (!item.id) return { ...item, id: generateId() };
                    return item;
                });
            }
            
            if (savedPurchased) {
                purchasedItems.value = JSON.parse(savedPurchased).map(item => {
                    if (!item.id) return { ...item, id: generateId() };
                    return item;
                });
            }
        };

        const saveItems = () => {
            localStorage.setItem('shoppingPlannedItems', JSON.stringify(plannedItems.value));
            localStorage.setItem('shoppingPurchasedItems', JSON.stringify(purchasedItems.value));
        };

        const generateId = () => {
            return Date.now().toString(36) + Math.random().toString(36).substring(2);
        };

        const addItem = () => {
            if (!isValidPlannedItem.value) {
                errorMessage.value = 'Por favor completa todos los campos correctamente';
                setTimeout(() => errorMessage.value = '', 3000);
                return;
            }

            const item = {
                ...newItem.value,
                id: generateId(),
                estimatedPrice: parseFloat(newItem.value.estimatedPrice),
                quantity: parseFloat(newItem.value.quantity),
                dateAdded: new Date().toISOString()
            };

            plannedItems.value.unshift(item);
            resetForm();
            saveItems();
            focusNameInput();
        };
        
        const addUnplannedItem = () => {
            if (!isValidUnplannedItem.value) {
                errorMessage.value = 'Por favor completa todos los campos correctamente';
                setTimeout(() => errorMessage.value = '', 3000);
                return;
            }

            const item = {
                ...unplannedItem.value,
                id: generateId(),
                actualPrice: parseFloat(unplannedItem.value.actualPrice),
                quantity: parseFloat(unplannedItem.value.quantity),
                purchaseDate: new Date().toISOString()
            };

            purchasedItems.value.unshift(item);
            unplannedItem.value = {
                name: '',
                category: 'supermercado',
                unit: 'unidades',
                quantity: 1,
                actualPrice: 0
            };
            saveItems();
        };

        const editPlannedItem = (index) => {
            const item = filteredPlannedItems.value[index];
            newItem.value = { 
                name: item.name,
                category: item.category,
                quantity: item.quantity,
                unit: item.unit,
                estimatedPrice: item.estimatedPrice
            };
            
            plannedItems.value = plannedItems.value.filter(i => i.id !== item.id);
            focusNameInput();
        };
        
        const editPurchasedItem = (index) => {
            const item = filteredPurchasedItems.value[index];
            priceModalItem.value = { ...item };
            priceModalIndex.value = purchasedItems.value.findIndex(i => i.id === item.id);
            showPriceModal.value = true;
        };
        
        const savePriceEdit = () => {
            if (priceModalItem.value.actualPrice <= 0) {
                errorMessage.value = 'El precio debe ser mayor que cero';
                setTimeout(() => errorMessage.value = '', 3000);
                return;
            }
            
            purchasedItems.value[priceModalIndex.value] = priceModalItem.value;
            saveItems();
            showPriceModal.value = false;
        };
        
        const cancelPriceEdit = () => {
            showPriceModal.value = false;
        };

        const confirmDelete = (index, listType) => {
            const item = listType === 'planned' 
                ? filteredPlannedItems.value[index] 
                : filteredPurchasedItems.value[index];
                
            showModal.value = true;
            modalTitle.value = 'Eliminar producto';
            modalMessage.value = `¿Estás seguro de que quieres eliminar "${item.name}"?`;
            modalConfirmText.value = 'Eliminar';
            modalAction.value = () => removeItem(index, listType);
        };

        const removeItem = (index, listType) => {
            const item = listType === 'planned' 
                ? filteredPlannedItems.value[index] 
                : filteredPurchasedItems.value[index];
                
            if (listType === 'planned') {
                plannedItems.value = plannedItems.value.filter(i => i.id !== item.id);
            } else {
                purchasedItems.value = purchasedItems.value.filter(i => i.id !== item.id);
            }
            
            saveItems();
            hideModal();
        };
        
        const moveToPurchased = (index) => {
            const item = filteredPlannedItems.value[index];
            const purchasedItem = {
                ...item,
                actualPrice: item.estimatedPrice,
                purchaseDate: new Date().toISOString()
            };
            
            plannedItems.value = plannedItems.value.filter(i => i.id !== item.id);
            purchasedItems.value.unshift(purchasedItem);
            saveItems();
        };
        
        const moveToPlanned = (index) => {
            const item = filteredPurchasedItems.value[index];
            const plannedItem = {
                name: item.name,
                category: item.category,
                quantity: item.quantity,
                unit: item.unit,
                estimatedPrice: item.estimatedPrice || item.actualPrice,
                dateAdded: new Date().toISOString(),
                id: generateId()
            };
            
            purchasedItems.value = purchasedItems.value.filter(i => i.id !== item.id);
            plannedItems.value.unshift(plannedItem);
            saveItems();
        };

        const clearCurrentList = () => {
            showModal.value = true;
            modalTitle.value = activeTab.value === 'planned' 
                ? 'Limpiar lista planeada' 
                : 'Limpiar lista de compras';
            modalMessage.value = activeTab.value === 'planned'
                ? '¿Estás seguro de que quieres eliminar todos los productos de tu lista planeada?'
                : '¿Estás seguro de que quieres eliminar todos los productos de tu lista de compras?';
            modalConfirmText.value = 'Limpiar todo';
            modalAction.value = () => {
                if (activeTab.value === 'planned') {
                    plannedItems.value = [];
                } else {
                    purchasedItems.value = [];
                }
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
                    plannedItems: plannedItems.value,
                    purchasedItems: purchasedItems.value
                });
                localStorage.setItem('savedLists', JSON.stringify(lists));
                alert(`Lista "${listName}" guardada correctamente`);
            }
        };

        const exportList = () => {
            const data = {
                date: new Date().toISOString(),
                plannedTotal: plannedItems.value.reduce((sum, item) => sum + (item.quantity * item.estimatedPrice), 0),
                purchasedTotal: purchasedItems.value.reduce((sum, item) => sum + (item.quantity * item.actualPrice), 0),
                plannedItems: plannedItems.value,
                purchasedItems: purchasedItems.value
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
            const currentDate = new Date().toLocaleDateString();
            
            printWindow.document.write(`
                <html>
                    <head>
                        <title>Lista de Compras</title>
                        <style>
                            body { font-family: Arial, sans-serif; padding: 20px; }
                            h1 { color: #3f51b5; }
                            h2 { color: #64748b; margin-top: 30px; }
                            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                            th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
                            th { background-color: #f5f5f5; }
                            .total { font-weight: bold; margin-top: 20px; }
                            .price-diff { font-size: 0.85em; color: #666; }
                            .positive { color: #4CAF50; }
                            .negative { color: #F44336; }
                        </style>
                    </head>
                    <body>
                        <h1>Lista de Compras</h1>
                        <p>Fecha: ${currentDate}</p>
                        
                        <h2>Lista Planeada</h2>
                        <table>
                            <thead>
                                <tr>
                                    <th>Producto</th>
                                    <th>Cantidad</th>
                                    <th>Precio Estimado</th>
                                    <th>Total Estimado</th>
                                    <th>Categoría</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${plannedItems.value.map(item => `
                                    <tr>
                                        <td>${item.name}</td>
                                        <td>${formatQuantity(item.quantity)} ${getUnitLabel(item.unit)}</td>
                                        <td>${item.estimatedPrice.toFixed(2)} €</td>
                                        <td>${(item.quantity * item.estimatedPrice).toFixed(2)} €</td>
                                        <td>${categories[item.category].name}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                        <div class="total">
                            Total Estimado: ${plannedItems.value.reduce((sum, item) => sum + (item.quantity * item.estimatedPrice), 0).toFixed(2)} €
                        </div>
                        
                        <h2>Compras Realizadas</h2>
                        <table>
                            <thead>
                                <tr>
                                    <th>Producto</th>
                                    <th>Cantidad</th>
                                    <th>Precio Real</th>
                                    <th>Total Real</th>
                                    <th>Diferencia</th>
                                    <th>Categoría</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${purchasedItems.value.map(item => `
                                    <tr>
                                        <td>${item.name}</td>
                                        <td>${formatQuantity(item.quantity)} ${getUnitLabel(item.unit)}</td>
                                        <td>${item.actualPrice.toFixed(2)} €</td>
                                        <td>${(item.quantity * item.actualPrice).toFixed(2)} €</td>
                                        <td class="${getPriceDifferenceClass(item)}">
                                            ${item.estimatedPrice ? getPriceDifference(item) : 'N/A'}
                                        </td>
                                        <td>${categories[item.category].name}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                        <div class="total">
                            Total Real: ${purchasedItems.value.reduce((sum, item) => sum + (item.quantity * item.actualPrice), 0).toFixed(2)} €
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
                    estimatedPrice: 1.50,
                    id: generateId(),
                    dateAdded: new Date().toISOString()
                },
                {
                    name: 'Tomates',
                    category: 'fruteria',
                    quantity: 0.5,
                    unit: 'kg',
                    estimatedPrice: 2.80,
                    id: generateId(),
                    dateAdded: new Date().toISOString()
                },
                {
                    name: 'Pasta Penne',
                    category: 'supermercado',
                    quantity: 1,
                    unit: 'paquete',
                    estimatedPrice: 1.20,
                    id: generateId(),
                    dateAdded: new Date().toISOString()
                },
                {
                    name: 'Pollo',
                    category: 'carniceria',
                    quantity: 1.2,
                    unit: 'kg',
                    estimatedPrice: 6.50,
                    id: generateId(),
                    dateAdded: new Date().toISOString()
                },
                {
                    name: 'Vino Chianti',
                    category: 'otros',
                    quantity: 1,
                    unit: 'botella',
                    estimatedPrice: 8.90,
                    id: generateId(),
                    dateAdded: new Date().toISOString()
                }
            ];
            
            plannedItems.value = [...sampleItems, ...plannedItems.value];
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
                estimatedPrice: 0
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
                modalAction.value();
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
        
        const getPriceDifference = (item) => {
            if (!item.estimatedPrice) return 'Sin comparación';
            const difference = item.actualPrice - item.estimatedPrice;
            return `${difference >= 0 ? '+' : ''}${difference.toFixed(2)} €`;
        };
        
        const calculatePriceDifference = (item) => {
            return (item.actualPrice - item.estimatedPrice).toFixed(2);
        };
        
        const calculatePercentageDifference = (item) => {
            return (((item.actualPrice - item.estimatedPrice) / item.estimatedPrice) * 100).toFixed(1);
        };
        
        const getPriceDifferenceClass = (item) => {
            if (!item.estimatedPrice) return 'neutral';
            const difference = item.actualPrice - item.estimatedPrice;
            if (difference > 0) return 'negative';
            if (difference < 0) return 'positive';
            return 'neutral';
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
            activeTab,
            newItem,
            unplannedItem,
            plannedItems,
            purchasedItems,
            searchQuery,
            filterCategory,
            errorMessage,
            showModal,
            modalTitle,
            modalMessage,
            modalConfirmText,
            showPriceModal,
            priceModalItem,
            isValidPlannedItem,
            isValidUnplannedItem,
            hasFilters,
            filteredPlannedItems,
            filteredPurchasedItems,
            currentItems,
            currentTotal,
            currentCategoryTotals,
            nameInput,
            addItem,
            addUnplannedItem,
            editPlannedItem,
            editPurchasedItem,
            savePriceEdit,
            cancelPriceEdit,
            removeItem,
            confirmDelete,
            moveToPurchased,
            moveToPlanned,
            clearCurrentList,
            saveList,
            exportList,
            printList,
            addSampleData,
            clearFilters,
            confirmAction,
            cancelAction,
            formatQuantity,
            formatDate,
            getUnitLabel,
            getPriceDifference,
            calculatePriceDifference,
            calculatePercentageDifference,
            getPriceDifferenceClass
        };
    }
}).mount('#app');