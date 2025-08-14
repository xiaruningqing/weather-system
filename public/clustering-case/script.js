// 一维K-means聚类演示功能（商品价格聚类）
class OneDimensionKMeansDemo {
    constructor() {
        this.canvas = document.getElementById('priceAxisCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.prices = [];
        this.centroids = [];
        this.clusters = [];
        this.currentStep = 0;
        this.currentPriceIndex = 0;
        this.iterationCount = 0;
        this.isAutoMode = false;
        this.autoInterval = null;
        this.colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'];
        
        // 闪烁动画相关属性
        this.priceBlinkInterval = null;
        this.currentBlinkingPricePoint = null;
        
        this.initCanvas();
        this.bindEvents();
    }
    
    initCanvas() {
        // 设置canvas尺寸
        this.canvas.width = 800;
        this.canvas.height = 200;
        this.drawPriceAxis();
    }
    
    bindEvents() {
        // 绑定canvas点击事件
        this.canvas.addEventListener('click', (e) => {
            if (this.currentStep === 0) {
                const rect = this.canvas.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const price = this.xToPrice(x);
                this.addPrice(price);
            }
        });
    }
    
    drawPriceAxis() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        const range = parseInt(document.getElementById('priceRange').value);
        const centerY = this.canvas.height / 2;
        
        // 绘制价格轴
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(50, centerY);
        this.ctx.lineTo(this.canvas.width - 50, centerY);
        this.ctx.stroke();
        
        // 绘制价格刻度
        this.ctx.fillStyle = '#e0e0e0';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';
        
        for (let i = 0; i <= 10; i++) {
            const x = 50 + (this.canvas.width - 100) * i / 10;
            const price = Math.round(range * i / 10);
            const y = centerY + 20;
            
            this.ctx.beginPath();
            this.ctx.moveTo(x, centerY - 5);
            this.ctx.lineTo(x, centerY + 5);
            this.ctx.stroke();
            
            this.ctx.fillText(`${price}元`, x, y);
        }
        
        // 绘制标题
        this.ctx.fillStyle = '#00d4ff';
        this.ctx.font = 'bold 16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('商品价格分布', this.canvas.width / 2, 30);
    }
    
    xToPrice(x) {
        const range = parseInt(document.getElementById('priceRange').value);
        const normalizedX = (x - 50) / (this.canvas.width - 100);
        return Math.max(0, Math.min(range, normalizedX * range));
    }
    
    priceToX(price) {
        const range = parseInt(document.getElementById('priceRange').value);
        const normalizedPrice = price / range;
        return 50 + (this.canvas.width - 100) * normalizedPrice;
    }
    
    addPrice(price) {
        this.prices.push({ price: price, cluster: -1 });
        this.drawPrices();
        this.updatePriceStepInfo(`已添加商品价格 ${Math.round(price)}元，共 ${this.prices.length} 个商品`);
        
        // 如果有质心，启用开始按钮
        if (this.centroids.length > 0) {
            document.querySelector('#page0 .start-btn').disabled = false;
        }
    }
    
    generateRandomPrices() {
        const count = parseInt(document.getElementById('productCount').value);
        const range = parseInt(document.getElementById('priceRange').value);
        
        this.prices = [];
        for (let i = 0; i < count; i++) {
            // 生成更真实的价格分布（偏向低价）
            const random = Math.random();
            let price;
            if (random < 0.6) {
                // 60%的概率生成低价商品（0-30%范围）
                price = Math.random() * range * 0.3;
            } else if (random < 0.9) {
                // 30%的概率生成中价商品（30%-70%范围）
                price = range * 0.3 + Math.random() * range * 0.4;
            } else {
                // 10%的概率生成高价商品（70%-100%范围）
                price = range * 0.7 + Math.random() * range * 0.3;
            }
            this.prices.push({ price: price, cluster: -1 });
        }
        
        this.drawPrices();
        this.updatePriceStepInfo(`已随机生成 ${count} 个商品价格`);
        
        // 如果有质心，启用开始按钮
        if (this.centroids.length > 0) {
            document.querySelector('#page0 .start-btn').disabled = false;
        }
    }
    
    initializePriceCentroids() {
        const k = parseInt(document.getElementById('priceKValue').value);
        const range = parseInt(document.getElementById('priceRange').value);
        
        this.centroids = [];
        for (let i = 0; i < k; i++) {
            // 在价格范围内均匀分布初始质心
            const price = range * (i + 1) / (k + 1);
            this.centroids.push({ price: price });
        }
        
        this.drawPrices();
        this.drawPriceCentroids();
        this.updatePriceCentroidsTable();
        this.updatePriceStepInfo(`已初始化 ${k} 个价格分组中心`);
        
        // 如果有价格数据，启用开始按钮
        if (this.prices.length > 0) {
            document.querySelector('#page0 .start-btn').disabled = false;
        }
    }
    
    startPriceClustering() {
        if (this.prices.length === 0 || this.centroids.length === 0) {
            alert('请先生成商品价格数据并初始化分组中心！');
            return;
        }
        
        this.currentStep = 1;
        // 从第一个商品开始分析
        this.currentPriceIndex = 0;
        this.iterationCount = 0;
        
        // 重置所有价格点的聚类
        this.prices.forEach(price => price.cluster = -1);
        
        // 重新绘制所有点为初始状态
        this.drawPrices();
        
        const firstPrice = this.prices[this.currentPriceIndex];
        
        if (this.isAutoMode) {
            this.updatePriceStepInfo(`自动演示：开始价格聚类分析，正在处理商品1/共${this.prices.length}个商品（价格：${Math.round(firstPrice.price)}元）...`);
        } else {
            this.updatePriceStepInfo(`开始价格聚类分析，正在处理商品1/共${this.prices.length}个商品（价格：${Math.round(firstPrice.price)}元），点击"下一步"完成分析并进入下一个商品...`);
            // 关闭自动模式
            this.isAutoMode = false;
            
            // 重置自动演示按钮状态
            const autoBtn = document.querySelector('#page0 .auto-btn');
            autoBtn.textContent = '自动演示';
            autoBtn.classList.remove('active');
        }
        
        // 启用下一步按钮，禁用开始按钮
        document.querySelector('#page0 .next-btn').disabled = false;
        document.querySelector('#page0 .start-btn').disabled = true;
        
        // 立即开始第一个商品的分析和闪烁
        this.startCurrentPricePointAnalysis();
    }
    
    startDemoBlinking() {
        // 随机选择的商品进行闪烁演示
        const demoPrice = this.prices[this.selectedDemoIndex];
        this.highlightPricePointOnCanvas(demoPrice, true);
    }
    
    startCurrentPricePointAnalysis() {
        const pricePoint = this.prices[this.currentPriceIndex];
        this.updateCurrentPricePoint(this.currentPriceIndex, pricePoint);
        
        // 计算到各个质心的距离
        const distanceDetails = [];
        let minDistance = Infinity;
        let closestCentroid = 0;
        
        this.centroids.forEach((centroid, index) => {
            const distance = Math.abs(pricePoint.price - centroid.price);
            distanceDetails.push({
                centroidIndex: index,
                distance: distance,
                centroidPrice: centroid.price
            });
            
            if (distance < minDistance) {
                minDistance = distance;
                closestCentroid = index;
            }
        });
        
        this.updatePriceDistanceCalc(pricePoint, distanceDetails, closestCentroid);
        
        // 开始闪烁当前价格点，持续闪烁直到用户点击"下一步"
        this.highlightPricePointOnCanvas(pricePoint, true);
    }
    
    completeCurrentPriceAnalysis() {
        const pricePoint = this.prices[this.currentPriceIndex];
        
        // 重新计算距离（确保数据准确）
        let minDistance = Infinity;
        let closestCentroid = 0;
        
        this.centroids.forEach((centroid, index) => {
            const distance = Math.abs(pricePoint.price - centroid.price);
            if (distance < minDistance) {
                minDistance = distance;
                closestCentroid = index;
            }
        });
        
        // 分配当前价格点到最近的聚类中心
        pricePoint.cluster = closestCentroid;
        
        // 重新绘制所有价格点，包括新分配的颜色
        this.drawPrices();
        
        // 更新聚类中心表格
        this.updatePriceCentroidsTable();
        
        const currentItemNumber = this.currentPriceIndex + 1;
        
        // 移动到下一个商品
        this.currentPriceIndex++;
        
        // 检查是否还有更多商品需要处理
        if (this.currentPriceIndex < this.prices.length) {
            // 还有商品需要处理
            if (this.isAutoMode) {
                // 自动模式：显示自动处理信息
                this.updatePriceStepInfo(`自动演示：商品${currentItemNumber}分析完成并归属到价格组${closestCentroid + 1}，正在处理商品${this.currentPriceIndex + 1}/共${this.prices.length}个商品...`);
                // 开始下一个商品的分析和闪烁
                this.startCurrentPricePointAnalysis();
            } else {
                // 手动模式：等待用户点击下一步
                this.updatePriceStepInfo(`商品${currentItemNumber}分析完成并归属到价格组${closestCentroid + 1}，正在处理商品${this.currentPriceIndex + 1}/共${this.prices.length}个商品，点击"下一步"继续...`);
                // 开始下一个商品的分析和闪烁
                this.startCurrentPricePointAnalysis();
            }
        } else {
            // 所有商品都处理完毕
            if (this.isAutoMode) {
                this.updatePriceStepInfo(`自动演示：商品${currentItemNumber}分析完成并归属到价格组${closestCentroid + 1}，所有商品分析完成！`);
            } else {
                this.updatePriceStepInfo(`商品${currentItemNumber}分析完成并归属到价格组${closestCentroid + 1}，所有商品分析完成！`);
            }
            
            // 进入完成阶段
            setTimeout(() => {
                this.assignPricesToClusters();
            }, 1000);
        }
    }
    
    async processNextPrice() {
        if (this.currentPriceIndex >= this.prices.length) {
            // 所有价格点都处理完毕，进入下一步
            await this.assignPricesToClusters();
            return;
        }
        
        const pricePoint = this.prices[this.currentPriceIndex];
        this.updateCurrentPricePoint(this.currentPriceIndex, pricePoint);
        
        // 计算到各个质心的距离
        const distanceDetails = [];
        let minDistance = Infinity;
        let closestCentroid = 0;
        
        this.centroids.forEach((centroid, index) => {
            const distance = Math.abs(pricePoint.price - centroid.price);
            distanceDetails.push({
                centroidIndex: index,
                distance: distance,
                centroidPrice: centroid.price
            });
            
            if (distance < minDistance) {
                minDistance = distance;
                closestCentroid = index;
            }
        });
        
        this.updatePriceDistanceCalc(pricePoint, distanceDetails, closestCentroid);
        
        // 分配当前价格点到最近的聚类中心
        pricePoint.cluster = closestCentroid;
        
        // 高亮当前价格点
        this.highlightPricePointOnCanvas(pricePoint, true);
        
        // 延迟后为当前点分配颜色并重绘
        setTimeout(() => {
            // 停止闪烁动画
            this.stopBlinkingPriceAnimation();
            
            // 重新绘制所有价格点，包括新分配的颜色
            this.drawPrices();
            
            // 更新聚类中心表格
            this.updatePriceCentroidsTable();
            
            // 在自动模式下才自动继续到下一个点
            if (this.isAutoMode) {
                this.currentPriceIndex++;
                // 自动继续处理下一个价格点
                this.processNextPrice();
            } else {
                // 手动模式下，显示提示信息等待用户点击"下一步"
                const currentItemNumber = this.currentPriceIndex + 1;
                if (this.currentPriceIndex + 1 < this.prices.length) {
                    this.updatePriceStepInfo(`商品${currentItemNumber}分析完成并归属到价格组${closestCentroid + 1}，点击"下一步"继续分析商品${currentItemNumber + 1}...`);
                } else {
                    this.updatePriceStepInfo(`商品${currentItemNumber}分析完成并归属到价格组${closestCentroid + 1}，点击"下一步"完成聚类分析...`);
                }
            }
        }, 1500); // 让用户能看到闪烁效果后再变色
    }
    
    async assignPricesToClusters() {
        // 所有商品都已经在处理过程中分配了聚类，直接完成分析
        this.updatePriceStepInfo('所有商品分析完成，正在生成最终结果...');
        
        // 确保所有商品都已绘制为正确的颜色
        this.drawPrices();
        
        // 延迟后直接完成聚类分析
        setTimeout(() => {
            this.completePriceClustering();
        }, 1000);
    }
    
    completePriceClustering() {
        this.updatePriceStepInfo('🎉 价格聚类分析完成！所有商品已按价格相似性分组。');
        
        // 更新聚类中心表格显示最终结果
        this.updatePriceCentroidsTable();
        
        // 显示完成结果
        this.checkPriceCompletion();
        
        // 禁用下一步按钮，重新启用开始按钮
        document.querySelector('#page0 .next-btn').disabled = true;
        document.querySelector('#page0 .start-btn').disabled = false;
    }
    
    updatePriceCentroids() {
        this.iterationCount++;
        this.updatePriceIterationCount();
        
        let centroidsChanged = false;
        
        // 计算每个聚类的平均价格
        for (let i = 0; i < this.centroids.length; i++) {
            const clusterPrices = this.prices.filter(p => p.cluster === i);
            
            if (clusterPrices.length > 0) {
                const avgPrice = clusterPrices.reduce((sum, p) => sum + p.price, 0) / clusterPrices.length;
                
                if (Math.abs(this.centroids[i].price - avgPrice) > 0.1) {
                    this.centroids[i].price = avgPrice;
                    centroidsChanged = true;
                }
            }
        }
        
        this.drawPrices();
        this.drawPriceCentroids();
        this.updatePriceCentroidsTable();
        
        if (centroidsChanged && this.iterationCount < 10) {
            this.updatePriceStepInfo(`第 ${this.iterationCount} 轮迭代完成，分组中心已更新，继续下一轮...`);
            
            // 重置聚类分配，准备下一轮迭代
            this.prices.forEach(price => price.cluster = -1);
            
            setTimeout(() => {
                this.currentPriceIndex = 0;
                this.processNextPrice();
            }, 1500); // 减少延迟时间，加快演示速度
        } else {
            this.updatePriceStepInfo(`聚类分析完成！共进行了 ${this.iterationCount} 轮迭代`);
            
            // 聚类完成后，恢复"下一步"按钮状态
            document.querySelector('#page0 .next-btn').disabled = false;
            
            // 如果是自动模式，则检查完成情况
            if (this.isAutoMode) {
                this.checkPriceCompletion();
            }
        }
    }
    
    drawPrices() {
        this.drawPriceAxis();
        
        this.prices.forEach((pricePoint, index) => {
            const x = this.priceToX(pricePoint.price);
            const y = this.canvas.height / 2;
            
            // 根据聚类设置颜色
            let color = '#00d4ff';
            if (pricePoint.cluster >= 0) {
                color = this.colors[pricePoint.cluster % this.colors.length];
            }
            
            this.ctx.fillStyle = color;
            this.ctx.beginPath();
            this.ctx.arc(x, y, 6, 0, 2 * Math.PI);
            this.ctx.fill();
            
            // 设置鼠标悬停事件（通过canvas事件处理）
            this.pricePoints = this.pricePoints || [];
            this.pricePoints[index] = {
                x: x,
                y: y,
                radius: 6,
                price: pricePoint.price
            };
        });
        
        // 添加鼠标移动事件监听器
        if (!this.mouseMoveListenerAdded) {
            this.canvas.addEventListener('mousemove', (e) => this.handlePriceHover(e));
            this.mouseMoveListenerAdded = true;
        }
    }
    
    handlePriceHover(e) {
        // 获取canvas的实际尺寸和显示尺寸的比例
        const canvasRect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / canvasRect.width;
        const scaleY = this.canvas.height / canvasRect.height;
        
        // 计算鼠标在canvas坐标系中的精确位置
        const mouseX = (e.clientX - canvasRect.left) * scaleX;
        const mouseY = (e.clientY - canvasRect.top) * scaleY;
        
        let hoveredPoint = null;
        
        // 检查是否悬停在价格点上
        if (this.pricePoints) {
            for (let i = 0; i < this.pricePoints.length; i++) {
                const point = this.pricePoints[i];
                const distance = Math.sqrt((mouseX - point.x) ** 2 + (mouseY - point.y) ** 2);
                
                // 增加检测半径，提高用户体验
                if (distance <= point.radius + 2) {
                    hoveredPoint = point;
                    break;
                }
            }
        }
        
        // 重绘画布并显示悬停信息
        this.drawPriceAxis();
        
        // 重新绘制所有价格点
        this.prices.forEach((pricePoint, index) => {
            const x = this.priceToX(pricePoint.price);
            const y = this.canvas.height / 2;
            
            let color = '#00d4ff';
            if (pricePoint.cluster >= 0) {
                color = this.colors[pricePoint.cluster % this.colors.length];
            }
            
            this.ctx.fillStyle = color;
            this.ctx.beginPath();
            this.ctx.arc(x, y, 6, 0, 2 * Math.PI);
            this.ctx.fill();
        });
        
        // 如果有悬停的点，显示价格标签
        if (hoveredPoint) {
            // 高亮显示当前悬停的点
            this.ctx.fillStyle = '#ffffff';
            this.ctx.strokeStyle = '#00d4ff';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(hoveredPoint.x, hoveredPoint.y, 8, 0, 2 * Math.PI);
            this.ctx.fill();
            this.ctx.stroke();
            
            // 绘制带背景的标签，提高可读性
            const labelText = `${Math.round(hoveredPoint.price)}`;
            const labelY = hoveredPoint.y - 20;
            
            // 绘制标签背景
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            const textWidth = this.ctx.measureText(labelText).width;
            this.ctx.fillRect(hoveredPoint.x - textWidth/2 - 5, labelY - 12, textWidth + 10, 18);
            
            // 绘制标签文本
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = 'bold 12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(labelText, hoveredPoint.x, labelY);
        }
        
        // 重绘质心
        if (this.centroids.length > 0) {
            this.drawPriceCentroids();
        }
    }
    
    drawPriceCentroids() {
        // 存储质心位置信息用于悬停检测
        this.centroidPoints = [];
        
        this.centroids.forEach((centroid, index) => {
            const x = this.priceToX(centroid.price);
            const y = this.canvas.height / 2;
            
            // 绘制质心（大圆圈）
            this.ctx.strokeStyle = this.colors[index % this.colors.length];
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.arc(x, y, 12, 0, 2 * Math.PI);
            this.ctx.stroke();
            
            // 绘制质心中心点
            this.ctx.fillStyle = this.colors[index % this.colors.length];
            this.ctx.beginPath();
            this.ctx.arc(x, y, 4, 0, 2 * Math.PI);
            this.ctx.fill();
            
            // 存储质心位置信息
            this.centroidPoints[index] = {
                x: x,
                y: y,
                radius: 12,
                price: centroid.price,
                index: index
            };
            
            // 始终显示质心标签（大的圆圈）
            // 绘制带背景的标签，提高可读性
            const labelText = `${Math.round(centroid.price)}`;
            const labelY = y + 25;
            
            // 绘制标签背景
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.font = 'bold 12px Arial';
            const textWidth = this.ctx.measureText(labelText).width;
            this.ctx.fillRect(x - textWidth/2 - 5, labelY - 12, textWidth + 10, 18);
            
            // 绘制标签文本
            this.ctx.fillStyle = this.colors[index % this.colors.length];
            this.ctx.textAlign = 'center';
            this.ctx.fillText(labelText, x, labelY);
            
            // 如果当前质心被悬停，则显示额外高亮效果
            if (this.hoveredCentroid === index) {
                // 高亮显示当前悬停的质心
                this.ctx.strokeStyle = '#ffd700';
                this.ctx.lineWidth = 3;
                this.ctx.beginPath();
                this.ctx.arc(x, y, 14, 0, 2 * Math.PI);
                this.ctx.stroke();
            }
        });
        
        // 添加质心悬停事件监听器
        if (!this.centroidMouseMoveListenerAdded) {
            this.canvas.addEventListener('mousemove', (e) => this.handleCentroidHover(e));
            this.centroidMouseMoveListenerAdded = true;
        }
    }
    
    handleCentroidHover(e) {
        // 获取canvas的实际尺寸和显示尺寸的比例
        const canvasRect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / canvasRect.width;
        const scaleY = this.canvas.height / canvasRect.height;
        
        // 计算鼠标在canvas坐标系中的精确位置
        const mouseX = (e.clientX - canvasRect.left) * scaleX;
        const mouseY = (e.clientY - canvasRect.top) * scaleY;
        
        let hoveredCentroidIndex = -1;
        
        // 检查是否悬停在质心上
        if (this.centroidPoints) {
            for (let i = 0; i < this.centroidPoints.length; i++) {
                const centroid = this.centroidPoints[i];
                const distance = Math.sqrt((mouseX - centroid.x) ** 2 + (mouseY - centroid.y) ** 2);
                
                // 增加检测半径，提高用户体验
                if (distance <= centroid.radius + 2) {
                    hoveredCentroidIndex = i;
                    break;
                }
            }
        }
        
        // 如果悬停状态改变，重绘
        if (this.hoveredCentroid !== hoveredCentroidIndex) {
            this.hoveredCentroid = hoveredCentroidIndex;
            this.drawPrices(); // 这会触发重绘整个画布
        }
    }
    
    updatePriceStepInfo(message) {
        const stepInfo = document.getElementById('priceStepInfo');
        stepInfo.textContent = message;
    }
    
    toggleAutoMode() {
        const autoBtn = document.querySelector('#page0 .auto-btn');
        
        if (this.isAutoMode) {
            this.stopAutoMode();
            autoBtn.textContent = '自动演示';
            autoBtn.classList.remove('active');
        } else {
            this.startAutoMode();
            autoBtn.textContent = '停止演示';
            autoBtn.classList.add('active');
        }
    }
    
    startAutoMode() {
        this.isAutoMode = true;
        
        // 如果没有数据，先随机生成
        if (this.prices.length === 0) {
            this.updatePriceStepInfo('自动演示：随机生成数据...');
            this.generateRandomPrices();
            
            // 延迟后初始化分组中心
            setTimeout(() => {
                if (!this.isAutoMode) return;
                this.updatePriceStepInfo('自动演示：初始化分组中心...');
                this.initializePriceCentroids();
                
                // 延迟后开始聚类分析
                setTimeout(() => {
                    if (!this.isAutoMode) return;
                    this.updatePriceStepInfo('自动演示：开始聚类分析...');
                    this.startPriceClustering();
                    // 开始自动处理
                    this.startAutoProcessing();
                }, 1500);
            }, 1500);
            return;
        }
        
        // 如果有数据但没有质心，初始化质心
        if (this.prices.length > 0 && this.centroids.length === 0) {
            this.updatePriceStepInfo('自动演示：初始化分组中心...');
            this.initializePriceCentroids();
            
            // 延迟后开始聚类分析
            setTimeout(() => {
                if (!this.isAutoMode) return;
                this.updatePriceStepInfo('自动演示：开始聚类分析...');
                this.startPriceClustering();
                // 开始自动处理
                this.startAutoProcessing();
            }, 1500);
            return;
        }
        
        // 如果已经有数据和质心，但还没开始聚类
        if (this.currentStep === 0) {
            this.updatePriceStepInfo('自动演示：开始聚类分析...');
            this.startPriceClustering();
            // 开始自动处理
            this.startAutoProcessing();
            return;
        }
        
        // 如果已经开始聚类，开始自动处理
        this.startAutoProcessing();
    }
    
    startAutoProcessing() {
        // 延迟2秒后开始第一次自动处理（让用户看到第一个商品的闪烁）
        setTimeout(() => {
            if (!this.isAutoMode) return;
            
            // 立即处理第一个商品
            this.autoProcessCurrentItem();
            
            // 设置自动处理定时器处理后续商品
            this.autoInterval = setInterval(() => {
                if (!this.isAutoMode) {
                    clearInterval(this.autoInterval);
                    return;
                }
                
                this.autoProcessCurrentItem();
            }, 2000); // 每2秒处理一个商品
        }, 2000);
    }
    
    autoProcessCurrentItem() {
        // 如果当前正在聚类步骤，自动完成当前商品分析
        if (this.currentStep === 1 && this.currentPriceIndex < this.prices.length) {
            // 停止当前闪烁
            this.stopBlinkingPriceAnimation();
            // 完成当前商品分析
            this.completeCurrentPriceAnalysis();
        } else if (this.currentPriceIndex >= this.prices.length) {
            // 所有商品都处理完毕，停止自动模式
            if (this.autoInterval) {
                clearInterval(this.autoInterval);
                this.autoInterval = null;
            }
        }
    }
    
    stopAutoMode() {
        this.isAutoMode = false;
        if (this.autoInterval) {
            clearInterval(this.autoInterval);
            this.autoInterval = null;
        }
        // 停止闪烁动画
        this.stopBlinkingPriceAnimation();
    }
    
    updatePriceCentroidsTable() {
        const tableBody = document.getElementById('priceCentroidsTableBody');
        tableBody.innerHTML = '';
        
        this.centroids.forEach((centroid, index) => {
            const clusterPrices = this.prices.filter(p => p.cluster === index);
            const row = document.createElement('div');
            row.className = 'centroid-row';
            
            row.innerHTML = `
                <span class="centroid-id">价格组${index + 1}</span>
                <span class="centroid-coords">${Math.round(centroid.price)}元</span>
                <span class="centroid-points">${clusterPrices.length}个商品</span>
            `;
            
            tableBody.appendChild(row);
        });
    }
    
    updatePriceIterationCount() {
        document.getElementById('priceIterationCount').textContent = this.iterationCount;
    }
    
    updateCurrentPricePoint(index, pricePoint) {
        const currentPoint = document.getElementById('currentPricePoint');
        const currentItemNumber = index + 1;
        currentPoint.textContent = `正在分析商品${currentItemNumber}/共${this.prices.length}个商品: ${Math.round(pricePoint.price)}元`;
    }
    
    updatePriceDistanceCalc(pricePoint, distanceDetails, closestCentroid) {
        const distanceCalc = document.getElementById('priceDistanceCalc');
        let html = '<div class="calculating">计算距离中...</div>';
        
        setTimeout(() => {
            html = distanceDetails.map(detail => 
                `<div class="highlight ${detail.centroidIndex === closestCentroid ? 'changed' : 'unchanged'}">
                    到价格组${detail.centroidIndex + 1}(${Math.round(detail.centroidPrice)}元)的距离: 
                    <strong>${Math.round(detail.distance)}元</strong>
                </div>`
            ).join('');
            
            distanceCalc.innerHTML = html;
        }, 500);
    }
    
    highlightPricePointOnCanvas(pricePoint, isHighlighted) {
        if (isHighlighted) {
            // 开始闪烁动画
            this.startBlinkingPriceAnimation(pricePoint);
        } else {
            // 停止闪烁动画
            this.stopBlinkingPriceAnimation();
        }
    }
    
    startBlinkingPriceAnimation(pricePoint) {
        // 清除之前的闪烁动画
        if (this.priceBlinkInterval) {
            clearInterval(this.priceBlinkInterval);
        }
        
        this.currentBlinkingPricePoint = pricePoint;
        let isVisible = true;
        
        this.priceBlinkInterval = setInterval(() => {
            // 重新绘制画布
            this.drawPriceAxis();
            this.drawPrices();
            this.drawPriceCentroids();
            
            // 绘制闪烁效果
            if (isVisible) {
                const x = this.priceToX(pricePoint.price);
                const y = this.canvas.height / 2;
                
                // 绘制内圈高亮
                this.ctx.beginPath();
                this.ctx.arc(x, y, 12, 0, 2 * Math.PI);
                this.ctx.strokeStyle = '#FFD700';
                this.ctx.lineWidth = 3;
                this.ctx.stroke();
                
                // 绘制外圈闪烁
                this.ctx.beginPath();
                this.ctx.arc(x, y, 16, 0, 2 * Math.PI);
                this.ctx.strokeStyle = 'rgba(255, 215, 0, 0.8)';
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
                
                // 绘制更外圈
                this.ctx.beginPath();
                this.ctx.arc(x, y, 20, 0, 2 * Math.PI);
                this.ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
                this.ctx.lineWidth = 1;
                this.ctx.stroke();
            }
            
            isVisible = !isVisible;
        }, 500); // 每500毫秒闪烁一次，与K-means演示保持一致
    }
    
    stopBlinkingPriceAnimation() {
        if (this.priceBlinkInterval) {
            clearInterval(this.priceBlinkInterval);
            this.priceBlinkInterval = null;
        }
        this.currentBlinkingPricePoint = null;
        
        // 重新绘制画布，移除闪烁效果
        this.drawPriceAxis();
        this.drawPrices();
        this.drawPriceCentroids();
    }
    
    checkPriceCompletion() {
        const resultMessage = document.getElementById('priceDemoResultMessage');
        const nextPageBtn = document.getElementById('priceDemoNextPageBtn');
        
        // 生成分析报告
        let report = '<h4>🎉 价格聚类分析完成！</h4>';
        report += '<div class="analysis-report">';
        
        this.centroids.forEach((centroid, index) => {
            const clusterPrices = this.prices.filter(p => p.cluster === index);
            const avgPrice = clusterPrices.reduce((sum, p) => sum + p.price, 0) / clusterPrices.length;
            const minPrice = Math.min(...clusterPrices.map(p => p.price));
            const maxPrice = Math.max(...clusterPrices.map(p => p.price));
            
            report += `
                <div class="cluster-report">
                    <h5>价格组${index + 1} (${Math.round(centroid.price)}元)</h5>
                    <p>商品数量: ${clusterPrices.length}个</p>
                    <p>价格范围: ${Math.round(minPrice)}-${Math.round(maxPrice)}元</p>
                    <p>平均价格: ${Math.round(avgPrice)}元</p>
                </div>
            `;
        });
        
        report += '</div>';
        resultMessage.innerHTML = report;
        
        document.getElementById('priceDemoResult').style.display = 'block';
        nextPageBtn.style.display = 'inline-block';
    }
    
    resetPriceDemo() {
        // 停止自动演示
        this.stopAutoMode();
        
        // 停止闪烁动画
        this.stopBlinkingPriceAnimation();
        
        this.prices = [];
        this.centroids = [];
        this.clusters = [];
        this.currentStep = 0;
        this.currentPriceIndex = 0;
        this.iterationCount = 0;
        
        this.drawPriceAxis();
        this.updatePriceStepInfo('准备开始价格聚类分析...');
        this.updatePriceIterationCount();
        this.updatePriceCentroidsTable();
        
        // 重置按钮状态
        document.querySelector('#page0 .start-btn').disabled = true;
        document.querySelector('#page0 .next-btn').disabled = true;
        document.querySelector('#page0 .auto-btn').textContent = '自动演示';
        document.querySelector('#page0 .auto-btn').classList.remove('active');
        
        // 隐藏结果
        document.getElementById('priceDemoResult').style.display = 'none';
        
        // 清空计算信息
        document.getElementById('currentPricePoint').textContent = '等待开始分析...';
        document.getElementById('priceDistanceCalc').innerHTML = '';
        document.getElementById('priceClusterAssignment').innerHTML = '';
    }
}

// K-means聚类演示功能
class KMeansDemo {
    constructor() {
        this.canvas = document.getElementById('clusteringCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.points = [];
        this.centroids = [];
        this.clusters = [];
        this.currentStep = 0;
        this.currentPointIndex = 0;
        this.iterationCount = 0;
        this.isAutoMode = false;
        this.autoInterval = null;
        this.colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'];
        
        // 闪烁动画相关属性
        this.blinkInterval = null;
        this.currentBlinkingPoint = null;
        
        this.initCanvas();
        this.bindEvents();
    }
    
    initCanvas() {
        // 设置canvas尺寸
        this.canvas.width = 600;
        this.canvas.height = 400;
        this.drawGrid();
    }
    
    bindEvents() {
        // 绑定canvas点击事件
        this.canvas.addEventListener('click', (e) => {
            if (this.currentStep === 0) {
                const rect = this.canvas.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                this.addPoint(x, y);
            }
        });
    }
    
    drawGrid() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 绘制网格
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 1;
        
        for (let x = 0; x <= this.canvas.width; x += 20) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        
        for (let y = 0; y <= this.canvas.height; y += 20) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
        
        // 绘制坐标轴
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.canvas.height / 2);
        this.ctx.lineTo(this.canvas.width, this.canvas.height / 2);
        this.ctx.stroke();
        
        this.ctx.beginPath();
        this.ctx.moveTo(this.canvas.width / 2, 0);
        this.ctx.lineTo(this.canvas.width / 2, this.canvas.height);
        this.ctx.stroke();
    }
    
    addPoint(x, y) {
        const rangeX = parseInt(document.getElementById('coordRange').value);
        const rangeY = parseInt(document.getElementById('coordRangeY').value);
        
        // 转换坐标
        const scaledX = (x - this.canvas.width / 2) * rangeX / (this.canvas.width / 2);
        const scaledY = (this.canvas.height / 2 - y) * rangeY / (this.canvas.height / 2);
        
        this.points.push({ x: scaledX, y: scaledY, cluster: -1 });
        this.drawPoints();
        this.updateStepInfo(`已添加点 (${Math.round(scaledX)}, ${Math.round(scaledY)})，共 ${this.points.length} 个点`);
        
        // 如果有质心，启用开始按钮
        if (this.centroids.length > 0) {
            document.querySelector('.start-btn').disabled = false;
        }
    }
    
    generateRandomPoints() {
        const count = parseInt(document.getElementById('pointCount').value);
        const rangeX = parseInt(document.getElementById('coordRange').value);
        const rangeY = parseInt(document.getElementById('coordRangeY').value);
        
        this.points = [];
        for (let i = 0; i < count; i++) {
            const x = Math.floor(Math.random() * rangeX - rangeX / 2);
            const y = Math.floor(Math.random() * rangeY - rangeY / 2);
            this.points.push({ x, y, cluster: -1 });
        }
        
        this.drawPoints();
        this.updateStepInfo(`已生成 ${count} 个随机点`);
        
        // 如果有质心，启用开始按钮
        if (this.centroids.length > 0) {
            document.querySelector('.start-btn').disabled = false;
        }
    }
    
    addManualPoint() {
        const x = parseInt(document.getElementById('manualX').value);
        const y = parseInt(document.getElementById('manualY').value);
        
        if (isNaN(x) || isNaN(y)) {
            this.updateStepInfo('请输入有效的坐标值');
            return;
        }
        
        this.points.push({ x, y, cluster: -1 });
        this.drawPoints();
        this.updateStepInfo(`已添加点 (${x}, ${y})，共 ${this.points.length} 个点`);
        
        // 清空输入框
        document.getElementById('manualX').value = '';
        document.getElementById('manualY').value = '';
        
        // 如果有质心，启用开始按钮
        if (this.centroids.length > 0) {
            document.querySelector('.start-btn').disabled = false;
        }
    }
    
    initializeCentroids() {
        const k = parseInt(document.getElementById('kValue').value);
        const rangeX = parseInt(document.getElementById('coordRange').value);
        const rangeY = parseInt(document.getElementById('coordRangeY').value);
        
        this.centroids = [];
        for (let i = 0; i < k; i++) {
            const x = Math.floor(Math.random() * rangeX - rangeX / 2);
            const y = Math.floor(Math.random() * rangeY - rangeY / 2);
            this.centroids.push({ x, y });
        }
        
        this.drawPoints();
        this.drawCentroids();
        this.updateStepInfo(`已初始化 ${k} 个质心`);
        this.updateCentroidsTable();
        
        // 启用开始按钮
        document.querySelector('.start-btn').disabled = false;
    }
    
    startClustering() {
        if (this.points.length === 0) {
            this.updateStepInfo('请先添加数据点');
            return;
        }
        
        if (this.centroids.length === 0) {
            this.updateStepInfo('请先初始化质心');
            return;
        }
        
        this.currentStep = 1;
        this.currentPointIndex = 0; // 从第一个点开始
        this.iterationCount = 1; // 开始第一轮迭代
        this.hasShownAnswer = false; // 标记是否已显示过答案
        this.updateStepInfo('准备开始聚类分析，请先点击底部的"显示答案"按钮查看计算过程');
        this.clearCalculationInfo();
        this.updateCentroidsTable();
        
        // 禁用下一步按钮，直到显示答案
        document.querySelector('.next-btn').disabled = true;
        
        // 显示右下角人物图片
        const page1Image = document.querySelector('.page1-image');
        if (page1Image) {
            page1Image.style.display = 'block';
        }
        
        // 开始处理第一个点，并立即开始闪烁
        this.processNextPoint();
    }
    
    async nextStep() {
        // 只在非自动模式且第一次时检查是否已点击显示答案按钮
        if (!this.isAutoMode && !this.hasShownAnswer) {
            const showAnswerBtn = document.querySelector('.show-answer-btn');
            if (showAnswerBtn && !showAnswerBtn.disabled) {
                this.updateStepInfo('请先点击底部的"显示答案"按钮查看计算过程，然后再继续');
                return;
            }
        }
        
        if (this.currentStep === 1) {
            // 如果还在处理数据点
            if (this.currentPointIndex < this.points.length) {
                // 移除当前点的高亮
                if (this.currentPointIndex > 0) {
                    this.highlightPointOnCanvas(this.points[this.currentPointIndex - 1], false);
                }
                
                // 处理当前点
                await this.processNextPoint();
                
                // 处理完当前点后移动到下一个点
                this.currentPointIndex++;
            } else {
                // 移除最后一个点的高亮
                if (this.points.length > 0) {
                    this.highlightPointOnCanvas(this.points[this.points.length - 1], false);
                }
                
                // 所有点都处理完了，更新质心
                const hasCentroidsChanged = this.updateCentroids();
                this.currentStep = 2;
                
                if (hasCentroidsChanged) {
                    this.updateStepInfo('步骤 2: 重新计算质心位置 - 质心已更新，继续迭代');
                    // 不清除计算信息，让质心更新信息保持显示
                    this.drawPoints();
                    this.drawCentroids();
                    
                    // 禁用下一步按钮，因为质心已更新
                    document.querySelector('.next-btn').disabled = true;
                    
                    // 如果是自动模式，停止自动演示
                    if (this.isAutoMode) {
                        this.stopAutoMode();
                        this.updateStepInfo('自动演示：质心已更新，演示完成。请点击"重置"按钮重新开始');
                    }
                } else {
                    // 质心没有变化，聚类收敛
                    this.updateStepInfo('🎉 聚类收敛！质心位置不再变化，算法已完成');
                    this.drawPoints();
                    this.drawCentroids();
                    
                    // 显示收敛信息
                    const distanceCalc = document.getElementById('distanceCalc');
                    distanceCalc.innerHTML += '<br><strong>🎯 聚类算法已收敛！</strong><br>所有质心位置稳定，聚类收敛。';
                    
                    // 禁用下一步按钮，因为聚类已收敛
                    document.querySelector('.next-btn').disabled = true;
                    document.querySelector('.next-btn').textContent = '聚类已收敛';
                    
                    // 显示进入下一页按钮
                    const demoResult = document.getElementById('demoResult');
                    const demoNextPageBtn = document.getElementById('demoNextPageBtn');
                    demoResult.style.display = 'block';
                    demoNextPageBtn.style.display = 'inline-block';
                }
            }
        } else if (this.currentStep === 2) {
            // 质心更新后，算法暂停，需要重置才能继续
            this.updateStepInfo('质心已更新，算法暂停。请点击"重置"按钮重新开始聚类分析');
            return;
        }
    }
    
    toggleAutoMode() {
        const autoBtn = document.querySelector('.auto-btn');
        
        if (this.isAutoMode) {
            this.stopAutoMode();
            autoBtn.textContent = '自动演示';
            autoBtn.classList.remove('active');
        } else {
            this.startAutoMode();
            autoBtn.textContent = '停止演示';
            autoBtn.classList.add('active');
        }
    }
    
    startAutoMode() {
        // 先清理任何现有的定时器
        if (this.autoInterval) {
            clearInterval(this.autoInterval);
            this.autoInterval = null;
        }
        
        this.isAutoMode = true;
        this.autoStep = 0; // 添加自动演示步骤计数器
        
        // 手动重置必要状态，不调用resetDemo以避免显示"准备开始聚类演示"
        this.points = [];
        this.centroids = [];
        this.clusters = [];
        this.currentStep = 0;
        this.hasShownAnswer = false;
        this.currentPointIndex = 0;
        this.iterationCount = 0;
        
        // 重置按钮状态
        document.querySelector('.start-btn').disabled = true;
        document.querySelector('.next-btn').disabled = true;
        
        // 停止闪烁动画
        this.stopBlinkingAnimation();
        
        // 隐藏右下角人物图片
        const page1Image = document.querySelector('.page1-image');
        if (page1Image) {
            page1Image.style.display = 'none';
        }
        
        // 绘制空网格
        this.drawGrid();
        this.clearCalculationInfo();
        this.updateCentroidsTable();
        
        // 开始自动演示流程
        this.runAutoDemo();
    }
    
    async runAutoDemo() {
        if (!this.isAutoMode) return;
        
        try {
            // 立即更新状态，避免显示"准备开始聚类演示"
            this.updateStepInfo('自动演示：正在启动...');
            await this.delay(100); // 短暂延迟确保UI更新
            
            // 步骤1: 随机生成数据点
            this.updateStepInfo('自动演示：步骤1 - 随机生成数据点...');
            this.generateRandomPoints();
            await this.delay(1000);
            
            if (!this.isAutoMode) return;
            
            // 步骤2: 初始化质心
            this.updateStepInfo('自动演示：步骤2 - 初始化质心...');
            this.initializeCentroids();
            await this.delay(1000);
            
            if (!this.isAutoMode) return;
            
            // 步骤3: 开始聚类分析（自动模式下直接设置状态）
            this.updateStepInfo('自动演示：步骤3 - 开始聚类分析...');
            
            // 直接设置聚类状态，绕过手动检查
            this.currentStep = 1;
            this.currentPointIndex = 0;
            this.iterationCount = 1;
            this.hasShownAnswer = true; // 设置为已显示答案
            this.clearCalculationInfo();
            this.updateCentroidsTable();
            
            // 启用下一步按钮
            const nextBtn = document.querySelector('.next-btn');
            if (nextBtn) nextBtn.disabled = false;
            
            // 显示右下角人物图片
            const page1Image = document.querySelector('.page1-image');
            if (page1Image) {
                page1Image.style.display = 'block';
            }
            
            await this.delay(1000);
            
            if (!this.isAutoMode) return;
            
            // 步骤4: 逐步进行聚类分析
            this.updateStepInfo('自动演示：步骤4 - 开始逐步分析数据点...');
            
            // 延迟一下，让用户看到步骤4的信息
            await this.delay(500);
            
            if (!this.isAutoMode) return;
            
            // 等待一下，然后开始自动步进（让nextStep处理第一个点）
            await this.delay(500);
            
            if (!this.isAutoMode) return;
            
            // 确保hasShownAnswer为true，这样nextStep不会被阻止
            this.hasShownAnswer = true;
            
            // 开始自动步进，包括第一个点
            this.startAutoStepByStep();
            
        } catch (error) {
            console.error('自动演示出错:', error);
            this.stopAutoMode();
        }
    }
    
    startAutoStepByStep() {
        // 使用1秒间隔进行逐步自动演示
        this.autoInterval = setInterval(() => {
            if (!this.isAutoMode) {
                clearInterval(this.autoInterval);
                return;
            }
            this.nextStep();
        }, 1000);
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    async processNextPoint() {
        if (this.currentPointIndex >= this.points.length) {
            // 所有点都处理完了
            this.updateStepInfo('所有数据点分配完成！正在更新质心位置...');
            this.drawPoints();
            this.drawCentroids();
            return Promise.resolve(); // 返回已解析的Promise
        }
        
        const point = this.points[this.currentPointIndex];
        
        // 显示当前处理的点
        this.updateCurrentPoint(this.currentPointIndex, point);
        this.highlightPointOnCanvas(point, true);
        
        // 计算到每个质心的距离
        let minDistance = Infinity;
        let closestCluster = -1;
        let distanceDetails = [];
        
        for (let j = 0; j < this.centroids.length; j++) {
            const centroid = this.centroids[j];
            const distance = this.calculateDistance(point, centroid);
            distanceDetails.push({
                cluster: j,
                distance: distance,
                centroid: centroid
            });
            
            if (distance < minDistance) {
                minDistance = distance;
                closestCluster = j;
            }
        }
        
        // 只有第一次迭代的第一个点需要手动填写，且不是自动模式，且没有显示过答案
        if (this.iterationCount === 1 && this.currentPointIndex === 0 && !this.isAutoMode && !this.hasShownAnswer) {
            // 确保第一个点能被立即分配聚类并变色
            point.cluster = closestCluster;
            this.drawPoints();
            this.drawCentroids();
            
            this.showManualInput(point, distanceDetails, closestCluster);
            return Promise.resolve(); // 返回已解析的Promise
        } else {
            // 显示距离计算详情（高亮最小距离）
            this.updateDistanceCalc(point, distanceDetails, closestCluster);
            
            // 显示聚类分配结果
            this.updateClusterAssignment(point, closestCluster);
            point.cluster = closestCluster;
            
            // 更新画布
            this.drawPoints();
            this.drawCentroids();
            
            if (this.isAutoMode) {
                // 更新步骤信息，显示自动模式
                this.updateStepInfo(`自动模式：已处理 ${this.currentPointIndex + 1}/${this.points.length} 个点`);
                
                // 在自动模式下，返回一个延迟解析的Promise
                return new Promise(resolve => {
                    setTimeout(() => {
                        // 停止闪烁动画
                        this.stopBlinkingAnimation();
                        resolve();
                    }, 50); // 使用非常短的延迟，加快演示速度
                });
            } else {
                // 更新步骤信息
                this.updateStepInfo(`已处理 ${this.currentPointIndex + 1}/${this.points.length} 个点，点击"下一步"继续`);
                return Promise.resolve(); // 返回已解析的Promise
            }
        }
    }
    
    showManualInput(point, distanceDetails, correctCluster) {
        // 创建手动输入界面
        const distanceCalc = document.getElementById('distanceCalc');
        const clusterAssignment = document.getElementById('clusterAssignment');
        
        let html = '<div class="manual-input-section">';
        html += '<h4>📝 手动填写计算过程</h4>';
        html += '<p>请根据距离公式 d = √[(x₁-x₂)² + (y₁-y₂)²] 填写计算过程：</p>';
        
        // 显示距离计算
        html += '<div class="distance-inputs">';
        distanceDetails.forEach((detail, index) => {
            const dx = point.x - detail.centroid.x;
            const dy = point.y - detail.centroid.y;
            const dxSquared = dx * dx;
            const dySquared = dy * dy;
            const sumSquared = dxSquared + dySquared;
            
            html += `<div class="distance-input-group">
                <label>到聚类${detail.cluster + 1}的距离计算：</label>
                <div class="formula-inputs">
                    <div class="formula-step">
                        <span>d = √[(<input type="number" class="formula-input" data-type="x1" data-correct="${Math.round(point.x)}" placeholder="x₁" onblur="validateInput(this)">-<input type="number" class="formula-input" data-type="x2" data-correct="${Math.round(detail.centroid.x)}" placeholder="x₂" onblur="validateInput(this)">)² + (<input type="number" class="formula-input" data-type="y1" data-correct="${Math.round(point.y)}" placeholder="y₁" onblur="validateInput(this)">-<input type="number" class="formula-input" data-type="y2" data-correct="${Math.round(detail.centroid.y)}" placeholder="y₂" onblur="validateInput(this)">)²]</span>
                    </div>
                    <div class="formula-step">
                        <span>d = √[(<input type="number" class="formula-input" data-type="dx" data-correct="${Math.round(dx)}" placeholder="差值" onblur="validateInput(this)">)² + (<input type="number" class="formula-input" data-type="dy" data-correct="${Math.round(dy)}" placeholder="差值" onblur="validateInput(this)">)²]</span>
                    </div>
                    <div class="formula-step">
                        <span>d = √[<input type="number" class="formula-input" data-type="dx2" data-correct="${Math.round(dxSquared)}" placeholder="平方" onblur="validateInput(this)"> + <input type="number" class="formula-input" data-type="dy2" data-correct="${Math.round(dySquared)}" placeholder="平方" onblur="validateInput(this)">]</span>
                    </div>
                    <div class="formula-step">
                        <span>d = √<input type="number" class="formula-input" data-type="sum" data-correct="${Math.round(sumSquared)}" placeholder="和" onblur="validateInput(this)"></span>
                    </div>
                    <div class="formula-step">
                        <span>d = <input type="number" class="formula-input" data-cluster="${detail.cluster}" data-correct="${Math.round(detail.distance)}" placeholder="距离" onblur="validateInput(this)"></span>
                    </div>
                </div>
                <span class="correct-answer" style="display:none;">正确答案：${detail.distance.toFixed(2)}</span>
            </div>`;
        });
        html += '</div>';
        
        // 显示聚类选择
        html += '<div class="cluster-input-group">';
        html += '<label>根据最小距离，该点属于哪个聚类？</label>';
        html += '<select class="cluster-select" onchange="validateClusterSelect(this)">';
        html += '<option value="">请选择聚类</option>';
        for (let i = 0; i < this.centroids.length; i++) {
            html += `<option value="${i}" data-correct="${i === correctCluster}">聚类${i + 1}</option>`;
        }
        html += '</select>';
        html += '</div>';
        
        // 添加显示答案按钮
        html += '<div class="answer-controls">';
        html += '<button class="show-answer-btn" onclick="showAnswer()">显示答案</button>';
        html += '</div>';
        
        html += '</div>';
        
        distanceCalc.innerHTML = html;
        clusterAssignment.innerHTML = '';
        
        // 更新步骤信息
        this.updateStepInfo(`请手动填写第${this.currentPointIndex + 1}个点的计算过程`);
        
        // 禁用下一步按钮
        document.querySelector('.next-btn').disabled = true;
    }
    
    async assignPointsToClustersWithDelay() {
        for (let i = 0; i < this.points.length; i++) {
            const point = this.points[i];
            
            // 步骤1: 显示当前处理的点
            this.updateCurrentPoint(i, point);
            this.highlightPointOnCanvas(point, true);
            await new Promise(resolve => setTimeout(resolve, 800));
            
            // 步骤2: 计算到每个质心的距离
            let minDistance = Infinity;
            let closestCluster = -1;
            let distanceDetails = [];
            
            for (let j = 0; j < this.centroids.length; j++) {
                const centroid = this.centroids[j];
                const distance = this.calculateDistance(point, centroid);
                distanceDetails.push({
                    cluster: j,
                    distance: distance,
                    centroid: centroid
                });
                
                if (distance < minDistance) {
                    minDistance = distance;
                    closestCluster = j;
                }
            }
            
            // 显示距离计算详情（高亮最小距离）
            this.updateDistanceCalc(point, distanceDetails, closestCluster);
            
            // 步骤3: 显示聚类分配结果
            this.updateClusterAssignment(point, closestCluster);
            this.highlightPointOnCanvas(point, false);
            point.cluster = closestCluster;
            
            // 更新画布显示
            this.drawPoints();
            this.drawCentroids();
            
            // 等待1秒让用户看到最终结果
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    
    stopAutoMode() {
        this.isAutoMode = false;
        this.autoStep = 0; // 重置自动演示步骤
        
        if (this.autoInterval) {
            clearInterval(this.autoInterval);
            this.autoInterval = null;
        }
        
        // 停止闪烁动画
        this.stopBlinkingAnimation();
        
        const autoBtn = document.querySelector('.auto-btn');
        if (autoBtn) {
            autoBtn.textContent = '自动演示';
            autoBtn.classList.remove('active');
            autoBtn.disabled = false; // 确保按钮可用
        }
    }
    
    assignPointsToClusters() {
        this.points.forEach((point, pointIndex) => {
            let minDistance = Infinity;
            let closestCluster = -1;
            let distanceDetails = [];
            
            // 显示当前处理的点
            this.updateCurrentPoint(pointIndex, point);
            
            this.centroids.forEach((centroid, index) => {
                const distance = this.calculateDistance(point, centroid);
                distanceDetails.push({
                    cluster: index,
                    distance: distance,
                    centroid: centroid
                });
                
                if (distance < minDistance) {
                    minDistance = distance;
                    closestCluster = index;
                }
            });
            
            // 显示距离计算详情
            this.updateDistanceCalc(point, distanceDetails, closestCluster);
            
            // 显示聚类分配结果
            this.updateClusterAssignment(point, closestCluster);
            
            point.cluster = closestCluster;
        });
        
        this.drawPoints();
    }
    
    updateCentroids() {
        let updateInfo = '<strong>🎯 质心更新详情:</strong><br>';
        let hasChanged = false;
        const changeThreshold = 0.1; // 变化阈值，小于此值认为没有变化
        
        this.centroids.forEach((centroid, clusterIndex) => {
            const clusterPoints = this.points.filter(point => point.cluster === clusterIndex);
            
            if (clusterPoints.length > 0) {
                const oldX = centroid.x;
                const oldY = centroid.y;
                const avgX = clusterPoints.reduce((sum, point) => sum + point.x, 0) / clusterPoints.length;
                const avgY = clusterPoints.reduce((sum, point) => sum + point.y, 0) / clusterPoints.length;
                
                // 检查质心是否发生变化
                const deltaX = Math.abs(avgX - oldX);
                const deltaY = Math.abs(avgY - oldY);
                const hasCentroidChanged = deltaX > changeThreshold || deltaY > changeThreshold;
                
                if (hasCentroidChanged) {
                    hasChanged = true;
                }
                
                centroid.x = avgX;
                centroid.y = avgY;
                
                const changeStatus = hasCentroidChanged ? 'changed' : 'unchanged';
                updateInfo += `<span class="highlight ${changeStatus}">聚类${clusterIndex + 1}: (${Math.round(oldX)}, ${Math.round(oldY)}) → (${Math.round(avgX)}, ${Math.round(avgY)}) [${clusterPoints.length}个点] ${hasCentroidChanged ? '🔄' : '✅'}</span><br>`;
            } else {
                updateInfo += `聚类${clusterIndex + 1}: 无数据点，保持原位置<br>`;
            }
        });
        
        // 更新计算信息显示
        const distanceCalc = document.getElementById('distanceCalc');
        distanceCalc.innerHTML = updateInfo;
        
        // 清空其他信息
        document.getElementById('currentPoint').innerHTML = '✅ 质心更新完成';
        document.getElementById('clusterAssignment').innerHTML = '';
        
        // 更新质心表格
        this.updateCentroidsTable();
        
        // 返回是否有变化
        return hasChanged;
    }
    
    calculateDistance(point1, point2) {
        const dx = point1.x - point2.x;
        const dy = point1.y - point2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    drawPoints() {
        this.drawGrid();
        
        this.points.forEach(point => {
            const screenX = (point.x * this.canvas.width / 2) / parseInt(document.getElementById('coordRange').value) + this.canvas.width / 2;
            const screenY = this.canvas.height / 2 - (point.y * this.canvas.height / 2) / parseInt(document.getElementById('coordRangeY').value);
            
            this.ctx.beginPath();
            this.ctx.arc(screenX, screenY, 6, 0, 2 * Math.PI);
            
            if (point.cluster >= 0) {
                this.ctx.fillStyle = this.colors[point.cluster % this.colors.length];
            } else {
                this.ctx.fillStyle = '#ffffff';
            }
            
            this.ctx.fill();
            this.ctx.strokeStyle = '#333';
            this.ctx.lineWidth = 1;
            this.ctx.stroke();
        });
    }
    
    drawCentroids() {
        this.centroids.forEach((centroid, index) => {
            const screenX = (centroid.x * this.canvas.width / 2) / parseInt(document.getElementById('coordRange').value) + this.canvas.width / 2;
            const screenY = this.canvas.height / 2 - (centroid.y * this.canvas.height / 2) / parseInt(document.getElementById('coordRangeY').value);
            
            // 绘制质心
            this.ctx.beginPath();
            this.ctx.arc(screenX, screenY, 10, 0, 2 * Math.PI);
            this.ctx.fillStyle = this.colors[index % this.colors.length];
            this.ctx.fill();
            this.ctx.strokeStyle = '#000';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            
            // 绘制质心编号
            this.ctx.fillStyle = '#000';
            this.ctx.font = 'bold 12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(index + 1, screenX, screenY + 4);
        });
    }
    
    updateStepInfo(message) {
        const stepInfo = document.getElementById('stepInfo');
        stepInfo.textContent = message;
    }
    
    updateCentroidsTable() {
        const tableBody = document.getElementById('centroidsTableBody');
        const iterationCount = document.getElementById('iterationCount');
        
        // 更新迭代轮数
        iterationCount.textContent = this.iterationCount;
        
        // 清空表格
        tableBody.innerHTML = '';
        
        // 添加质心行
        this.centroids.forEach((centroid, index) => {
            const clusterPoints = this.points.filter(point => point.cluster === index);
            const pointCount = clusterPoints.length;
            
            const row = document.createElement('div');
            row.className = 'centroid-row';
            row.innerHTML = `
                <span class="centroid-id">聚类${index + 1}</span>
                <span class="centroid-coords">(${Math.round(centroid.x)}, ${Math.round(centroid.y)})</span>
                <span class="centroid-points">${pointCount}个</span>
            `;
            
            tableBody.appendChild(row);
        });
    }
    
    updateCurrentPoint(pointIndex, point) {
        const currentPoint = document.getElementById('currentPoint');
        currentPoint.innerHTML = `<span class="calculating">🎯 正在处理点 ${pointIndex + 1}: (${Math.round(point.x)}, ${Math.round(point.y)})</span>`;
    }
    
    updateDistanceCalc(point, distanceDetails, closestCluster) {
        const distanceCalc = document.getElementById('distanceCalc');
        let html = '<strong>距离计算:</strong><br>';
        
        // 显示所有距离计算，高亮最小距离
        distanceDetails.forEach(detail => {
            const isClosest = detail.cluster === closestCluster;
            const highlightClass = isClosest ? 'highlight' : '';
            
            // 计算距离公式的数值代入
            const dx = point.x - detail.centroid.x;
            const dy = point.y - detail.centroid.y;
            const dxSquared = dx * dx;
            const dySquared = dy * dy;
            const sumSquared = dxSquared + dySquared;
            
            html += `<div class="${highlightClass}">到聚类${detail.cluster + 1}: d = √[(${Math.round(point.x)}-${Math.round(detail.centroid.x)})² + (${Math.round(point.y)}-${Math.round(detail.centroid.y)})²] = √[${dxSquared.toFixed(2)} + ${dySquared.toFixed(2)}] = √${sumSquared.toFixed(2)} = ${detail.distance.toFixed(2)}${isClosest ? ' (最小)' : ''}</div>`;
        });
        
        distanceCalc.innerHTML = html;
    }
    
    updateClusterAssignment(point, clusterIndex) {
        const clusterAssignment = document.getElementById('clusterAssignment');
        clusterAssignment.innerHTML = `<span class="highlight">✅ 分配完成: 点 (${Math.round(point.x)}, ${Math.round(point.y)}) → 聚类 ${clusterIndex + 1}</span>`;
    }
    
    clearCalculationInfo() {
        document.getElementById('currentPoint').innerHTML = '⏳ 等待开始聚类计算...';
        document.getElementById('distanceCalc').innerHTML = '';
        document.getElementById('clusterAssignment').innerHTML = '';
    }
    
    highlightPointOnCanvas(point, isHighlighted) {
        if (isHighlighted) {
            // 开始闪烁动画
            this.startBlinkingAnimation(point);
        } else {
            // 停止闪烁动画
            this.stopBlinkingAnimation();
        }
    }
    
    startBlinkingAnimation(point) {
        // 清除之前的闪烁动画
        if (this.blinkInterval) {
            clearInterval(this.blinkInterval);
        }
        
        this.currentBlinkingPoint = point;
        let isVisible = true;
        
        this.blinkInterval = setInterval(() => {
            // 重新绘制画布
            this.drawGrid();
            this.drawPoints();
            this.drawCentroids();
            
            // 绘制闪烁效果
            if (isVisible) {
                const screenX = (point.x * this.canvas.width / 2) / parseInt(document.getElementById('coordRange').value) + this.canvas.width / 2;
                const screenY = this.canvas.height / 2 - (point.y * this.canvas.height / 2) / parseInt(document.getElementById('coordRangeY').value);
                
                // 绘制内圈高亮
                this.ctx.beginPath();
                this.ctx.arc(screenX, screenY, 12, 0, 2 * Math.PI);
                this.ctx.strokeStyle = '#FFD700';
                this.ctx.lineWidth = 3;
                this.ctx.stroke();
                
                // 绘制外圈闪烁
                this.ctx.beginPath();
                this.ctx.arc(screenX, screenY, 16, 0, 2 * Math.PI);
                this.ctx.strokeStyle = 'rgba(255, 215, 0, 0.8)';
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
                
                // 绘制更外圈
                this.ctx.beginPath();
                this.ctx.arc(screenX, screenY, 20, 0, 2 * Math.PI);
                this.ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
                this.ctx.lineWidth = 1;
                this.ctx.stroke();
            }
            
            isVisible = !isVisible;
        }, 500); // 每500毫秒闪烁一次
    }
    
    stopBlinkingAnimation() {
        if (this.blinkInterval) {
            clearInterval(this.blinkInterval);
            this.blinkInterval = null;
        }
        this.currentBlinkingPoint = null;
        
        // 重新绘制画布，移除闪烁效果
        this.drawGrid();
        this.drawPoints();
        this.drawCentroids();
    }
    
    highlightCentroidOnCanvas(centroid, isHighlighted) {
        const screenX = (centroid.x * this.canvas.width / 2) / parseInt(document.getElementById('coordRange').value) + this.canvas.width / 2;
        const screenY = this.canvas.height / 2 - (centroid.y * this.canvas.height / 2) / parseInt(document.getElementById('coordRangeY').value);
        
        // 绘制高亮圆圈
        this.ctx.beginPath();
        this.ctx.arc(screenX, screenY, 15, 0, 2 * Math.PI);
        this.ctx.strokeStyle = isHighlighted ? '#FF6B6B' : 'transparent';
        this.ctx.lineWidth = 4;
        this.ctx.stroke();
        
        // 绘制闪烁效果
        if (isHighlighted) {
            this.ctx.beginPath();
            this.ctx.arc(screenX, screenY, 20, 0, 2 * Math.PI);
            this.ctx.strokeStyle = 'rgba(255, 107, 107, 0.6)';
            this.ctx.lineWidth = 3;
            this.ctx.stroke();
        }
    }
    
    resetDemo() {
        this.stopAutoMode();
        this.points = [];
        this.centroids = [];
        this.clusters = [];
        this.currentStep = 0;
        this.hasShownAnswer = false; // 重置显示答案标志
        this.currentPointIndex = 0;
        this.iterationCount = 0;
        
        document.querySelector('.start-btn').disabled = true;
        document.querySelector('.next-btn').disabled = true;
        document.querySelector('.auto-btn').textContent = '自动演示';
        document.querySelector('.auto-btn').classList.remove('active');
        
        // 停止闪烁动画
        this.stopBlinkingAnimation();
        
        // 重置显示答案按钮状态
        const showAnswerBtn = document.querySelector('.show-answer-btn');
        if (showAnswerBtn) {
            showAnswerBtn.textContent = '显示答案';
            showAnswerBtn.disabled = false;
            showAnswerBtn.style.backgroundColor = '';
        }
        
        // 隐藏右下角人物图片
        const page1Image = document.querySelector('.page1-image');
        if (page1Image) {
            page1Image.style.display = 'none';
        }
        
        this.drawGrid();
        this.updateStepInfo('🎯 准备开始聚类演示...');
        this.clearCalculationInfo();
        this.updateCentroidsTable();
        
        // 移除所有点的高亮
        this.points.forEach(point => {
            this.highlightPointOnCanvas(point, false);
        });
    }
    
    checkCompletion() {
        // 检查是否完成聚类（质心不再移动）
        if (this.currentStep > 0 && this.points.length > 0) {
            const demoResult = document.getElementById('demoResult');
            const demoNextPageBtn = document.getElementById('demoNextPageBtn');
            
            demoResult.style.display = 'block';
            demoNextPageBtn.style.display = 'inline-block';
            this.updateStepInfo('聚类收敛！可以继续下一轮或进入下一页继续学习。');
        }
    }
    
    // 执行整个聚类过程
    async nextStepWithCompletion() {
        // 设置自动模式标志，但不使用定时器
        this.isAutoMode = true;
        
        // 执行所有步骤直到完成
        let isCompleted = false;
        
        while (!isCompleted) {
            await this.nextStep();
            
            // 检查是否已经完成
            if (this.currentStep === 2 && this.currentPointIndex >= this.points.length) {
                // 如果当前是步骤2（更新质心）且所有点都处理完了
                isCompleted = true;
            }
            
            // 短暂延迟，让UI有时间更新
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // 完成后重置自动模式标志
        this.isAutoMode = false;
        
        // 检查聚类是否完成
        this.checkCompletion();
    }
}

// 全局变量
let kmeansDemo;
let oneDimensionDemo;
let autoInitCentroids = false; // 控制是否自动初始化质心

// 导航和解锁状态管理
let unlockedPages = {
    page0: true,  // 入门体验页面默认解锁
    page1: true,  // 聚类算法可视化页面默认解锁
    page2: true,  // 流程排序页面默认解锁
    page3: true,  // 代码学习页面默认解锁
    page4: true   // 图片压缩页面默认解锁
};

// 导航到指定页面
function navigateToPage(pageId) {
    // 移除页面锁定检查，允许直接访问任何页面
    
    // 隐藏所有页面
    document.querySelectorAll('.page-container').forEach(page => {
        page.style.display = 'none';
    });
    
    // 显示目标页面
    document.getElementById(pageId).style.display = 'block';
    
    // 更新导航栏状态
    updateNavStatus(pageId);
    
    // 滚动到顶部
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
    
    // 特殊处理：如果是page4，初始化ImageProcessor
    if (pageId === 'page4' && !window.imageProcessor) {
        window.imageProcessor = new ImageProcessor();
    }
}

// 更新导航栏状态
function updateNavStatus(activePageId) {
    document.querySelectorAll('.nav-item').forEach(item => {
        const pageId = item.getAttribute('data-page');
        item.classList.remove('active');
        
        if (pageId === activePageId) {
            item.classList.add('active');
        }
    });
}

// 解锁页面
function unlockPage(pageId) {
    unlockedPages[pageId] = true;
    
    const navItem = document.querySelector(`[data-page="${pageId}"]`);
    if (navItem) {
        navItem.classList.remove('locked');
        navItem.classList.add('unlocked');
        
        const statusElement = navItem.querySelector('.nav-status');
        if (statusElement) {
            statusElement.textContent = '已解锁';
            statusElement.className = 'nav-status unlocked';
        }
    }
}

// 页面切换函数
function goToNextPageFromDemo() {
    document.getElementById('page1').style.display = 'none';
    document.getElementById('page2').style.display = 'block';
    
    // 隐藏右下角人物图片
    const page1Image = document.querySelector('.page1-image');
    if (page1Image) {
        page1Image.style.display = 'none';
    }
    
    // 解锁第二页
    unlockPage('page2');
    
    // 更新导航栏状态
    updateNavStatus('page2');
    
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// 入门页面函数
function generateRandomPrices() {
    if (oneDimensionDemo) {
        oneDimensionDemo.generateRandomPrices();
        // 不再自动初始化质心
    }
}

function addManualPrice() {
    const priceInput = document.getElementById('manualPrice');
    const price = parseFloat(priceInput.value);
    
    if (isNaN(price) || price < 0) {
        alert('请输入有效的价格！');
        return;
    }
    
    if (oneDimensionDemo) oneDimensionDemo.addPrice(price);
    priceInput.value = '';
}

function initializePriceCentroids() {
    if (oneDimensionDemo) oneDimensionDemo.initializePriceCentroids();
}

function startPriceClustering() {
    if (oneDimensionDemo) {
        // 调用类方法准备聚类分析，需要用户点击"下一步"才会开始
        oneDimensionDemo.startPriceClustering();
    }
}

function nextPriceStep() {
    if (oneDimensionDemo) {
        console.log("执行下一步");
        
        // 如果当前在聚类步骤1（处理价格点）
        if (oneDimensionDemo.currentStep === 1) {
            // 处理当前正在闪烁的商品
            const currentPrice = oneDimensionDemo.prices[oneDimensionDemo.currentPriceIndex];
            
            // 停止当前点的闪烁动画
            oneDimensionDemo.stopBlinkingPriceAnimation();
            
            // 立即完成当前商品的分析（分配聚类并变色）
            oneDimensionDemo.completeCurrentPriceAnalysis();
            
        } else {
            // 其他步骤的处理
            if (typeof oneDimensionDemo.processNextPrice === 'function') {
                oneDimensionDemo.processNextPrice();
            } else {
                console.error("processNextPrice方法不存在");
            }
        }
    } else {
        console.error("oneDimensionDemo未初始化");
    }
}

function togglePriceAutoMode() {
    if (oneDimensionDemo) oneDimensionDemo.toggleAutoMode();
}

function resetPriceDemo() {
    if (oneDimensionDemo) oneDimensionDemo.resetPriceDemo();
}

function goToNextPageFromPriceDemo() {
    // 解锁第一页
    unlockPage('page1');
    
    // 隐藏第零页
    const page0 = document.getElementById('page0');
    page0.style.display = 'none';
    
    // 显示第一页
    const page1 = document.getElementById('page1');
    page1.style.display = 'block';
    
    // 更新导航栏状态
    updateNavStatus('page1');
    
    // 滚动到页面顶部
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// 绑定演示页面的按钮事件
function generateRandomPoints() {
    if (kmeansDemo) kmeansDemo.generateRandomPoints();
}

function addManualPoint() {
    if (kmeansDemo) kmeansDemo.addManualPoint();
}

function initializeCentroids() {
    if (kmeansDemo) kmeansDemo.initializeCentroids();
}

function startClustering() {
    if (kmeansDemo) {
        kmeansDemo.startClustering();
        // 禁用下一步按钮，直到显示答案
        const nextBtn = document.querySelector('#page1 .next-btn');
        if (nextBtn) nextBtn.disabled = true;
    }
}

function nextStep() {
    if (kmeansDemo) {
        // 逐步进行聚类过程，每次点击处理一个步骤
        kmeansDemo.nextStep();
    }
}

// 一次性运行完整分析过程的函数
async function runFullAnalysis() {
    if (!kmeansDemo) return;
    
    // 禁用下一步按钮，防止重复点击
    const nextBtn = document.querySelector('#page1 .next-btn');
    if (nextBtn) nextBtn.disabled = true;
    
    // 更新状态提示
    kmeansDemo.updateStepInfo('自动执行聚类分析中...');
    
    // 设置为自动模式
    kmeansDemo.isAutoMode = true;
    
    // 一直执行到聚类收敛
    let converged = false;
    let maxIterations = 20; // 设置最大迭代次数，防止无限循环
    let iterations = 0;
    
    while (!converged && iterations < maxIterations) {
        // 处理所有点
        while (kmeansDemo.currentStep === 1 && kmeansDemo.currentPointIndex < kmeansDemo.points.length) {
            kmeansDemo.currentPointIndex++;
            if (kmeansDemo.currentPointIndex < kmeansDemo.points.length) {
                const point = kmeansDemo.points[kmeansDemo.currentPointIndex];
                
                // 计算到各个质心的距离
                let minDistance = Infinity;
                let closestCluster = -1;
                
                for (let j = 0; j < kmeansDemo.centroids.length; j++) {
                    const centroid = kmeansDemo.centroids[j];
                    const distance = kmeansDemo.calculateDistance(point, centroid);
                    
                    if (distance < minDistance) {
                        minDistance = distance;
                        closestCluster = j;
                    }
                }
                
                // 分配点到最近的聚类
                point.cluster = closestCluster;
            }
            
            // 更新画布
            kmeansDemo.drawPoints();
            kmeansDemo.drawCentroids();
            
            // 更新状态信息
            kmeansDemo.updateStepInfo(`自动模式：已处理 ${kmeansDemo.currentPointIndex}/${kmeansDemo.points.length} 个点`);
            
            // 短暂延迟，让UI有时间更新
            await new Promise(resolve => setTimeout(resolve, 10));
        }
        
        // 所有点都处理完了，更新质心
        if (kmeansDemo.currentPointIndex >= kmeansDemo.points.length) {
            const hasCentroidsChanged = kmeansDemo.updateCentroids();
            kmeansDemo.currentStep = 2;
            
            // 如果质心没有变化，聚类收敛
            if (!hasCentroidsChanged) {
                converged = true;
                kmeansDemo.updateStepInfo('🎉 聚类收敛！质心位置不再变化，算法已完成');
                
                // 显示收敛信息
                const distanceCalc = document.getElementById('distanceCalc');
                if (distanceCalc) {
                    distanceCalc.innerHTML += '<br><strong>🎯 聚类算法已收敛！</strong><br>所有质心位置稳定，聚类收敛。';
                }
                
                // 显示进入下一页按钮
                const demoResult = document.getElementById('demoResult');
                const demoNextPageBtn = document.getElementById('demoNextPageBtn');
                if (demoResult && demoNextPageBtn) {
                    demoResult.style.display = 'block';
                    demoNextPageBtn.style.display = 'inline-block';
                }
                
                // 禁用下一步按钮，因为聚类已收敛
                if (nextBtn) {
                    nextBtn.disabled = true;
                    nextBtn.textContent = '聚类已收敛';
                }
                
                break;
            } else {
                // 质心有变化，按照新流程在质心更新后停止
                kmeansDemo.updateStepInfo('自动演示：质心已更新，演示完成。请点击"重置"按钮重新开始');
                
                // 禁用下一步按钮
                if (nextBtn) {
                    nextBtn.disabled = true;
                }
                
                // 停止自动演示
                break;
            }
        }
        
        iterations++;
    }
    
    // 恢复自动模式标志
    kmeansDemo.isAutoMode = false;
    
    // 如果达到最大迭代次数但没有收敛
    if (iterations >= maxIterations && !converged) {
        kmeansDemo.updateStepInfo(`已达到最大迭代次数 ${maxIterations}，算法停止`);
    }
    
    // 更新画布最终状态
    kmeansDemo.drawPoints();
    kmeansDemo.drawCentroids();
    kmeansDemo.updateCentroidsTable();
}

function toggleAutoMode() {
    if (kmeansDemo) {
        kmeansDemo.toggleAutoMode();
    }
}

// 全自动演示功能
async function runFullAutoDemo() {
    if (!kmeansDemo) return;
    
    // 更新按钮状态
    const autoBtn = document.querySelector('.auto-btn');
    autoBtn.textContent = '演示中...';
    autoBtn.disabled = true;
    
    try {
        // 步骤1: 随机生成数据点
        kmeansDemo.updateStepInfo('自动演示：随机生成数据点...');
        kmeansDemo.points = [];
        kmeansDemo.generateRandomPoints();
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 步骤2: 初始化质心
        kmeansDemo.updateStepInfo('自动演示：初始化质心...');
        kmeansDemo.initializeCentroids();
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 步骤3: 开始聚类分析
        kmeansDemo.updateStepInfo('自动演示：开始聚类分析...');
        kmeansDemo.currentStep = 1;
        kmeansDemo.currentPointIndex = 0;
        kmeansDemo.iterationCount = 1;
        
        // 步骤4: 执行完整的聚类分析
        await runFullAnalysis();
        
    } catch (error) {
        console.error('自动演示出错:', error);
        kmeansDemo.updateStepInfo('自动演示出错，请重试');
    } finally {
        // 恢复按钮状态
        autoBtn.textContent = '自动演示';
        autoBtn.disabled = false;
    }
}

function resetDemo() {
    if (kmeansDemo) kmeansDemo.resetDemo();
}

class KMeansCompressor {
    constructor() {
        this.kValues = [16, 32, 64, 128, 256];
        this.originalImage = null;
        this.maxPixels = 800 * 600; // 最大像素数限制
    }

    async compressImage(imageData, k) {
        // 如果图片太大，先缩小
        const resizedData = this.resizeImageIfNeeded(imageData);
        const pixels = this.getPixels(resizedData);
        const centers = await this.kMeans(pixels, k);
        return this.reconstructImage(resizedData, centers, k);
    }

    resizeImageIfNeeded(imageData) {
        const totalPixels = imageData.width * imageData.height;
        if (totalPixels <= this.maxPixels) {
            return imageData;
        }

        // 计算缩放比例
        const scale = Math.sqrt(this.maxPixels / totalPixels);
        const newWidth = Math.round(imageData.width * scale);
        const newHeight = Math.round(imageData.height * scale);

        // 创建临时canvas进行缩放
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = imageData.width;
        tempCanvas.height = imageData.height;
        tempCtx.putImageData(imageData, 0, 0);

        const scaledCanvas = document.createElement('canvas');
        const scaledCtx = scaledCanvas.getContext('2d');
        scaledCanvas.width = newWidth;
        scaledCanvas.height = newHeight;
        scaledCtx.drawImage(tempCanvas, 0, 0, newWidth, newHeight);

        return scaledCtx.getImageData(0, 0, newWidth, newHeight);
    }

    getPixels(imageData) {
        const pixels = [];
        // 采样像素以减少计算量
        const step = Math.max(1, Math.floor(imageData.data.length / (4 * 10000)));
        
        for (let i = 0; i < imageData.data.length; i += 4 * step) {
            pixels.push([
                imageData.data[i],     // R
                imageData.data[i + 1], // G
                imageData.data[i + 2]  // B
            ]);
        }
        return pixels;
    }

    async kMeans(pixels, k) {
        // 限制最大迭代次数和像素数量
        const maxIterations = 50;
        const maxPixels = 5000;
        
        if (pixels.length > maxPixels) {
            pixels = this.samplePixels(pixels, maxPixels);
        }

        // 随机初始化聚类中心
        const centers = [];
        for (let i = 0; i < k; i++) {
            const randomIndex = Math.floor(Math.random() * pixels.length);
            centers.push([...pixels[randomIndex]]);
        }

        let iterations = 0;

        while (iterations < maxIterations) {
            // 分配像素到最近的聚类中心
            const clusters = Array.from({ length: k }, () => []);
            
            for (let i = 0; i < pixels.length; i++) {
                let minDistance = Infinity;
                let closestCenter = 0;
                
                for (let j = 0; j < k; j++) {
                    const distance = this.calculateDistance(pixels[i], centers[j]);
                    if (distance < minDistance) {
                        minDistance = distance;
                        closestCenter = j;
                    }
                }
                
                clusters[closestCenter].push(i);
            }

            // 更新聚类中心
            let centersChanged = false;
            for (let i = 0; i < k; i++) {
                if (clusters[i].length === 0) continue;
                
                const newCenter = [0, 0, 0];
                for (const pixelIndex of clusters[i]) {
                    newCenter[0] += pixels[pixelIndex][0];
                    newCenter[1] += pixels[pixelIndex][1];
                    newCenter[2] += pixels[pixelIndex][2];
                }
                
                newCenter[0] = Math.round(newCenter[0] / clusters[i].length);
                newCenter[1] = Math.round(newCenter[1] / clusters[i].length);
                newCenter[2] = Math.round(newCenter[2] / clusters[i].length);
                
                if (this.calculateDistance(centers[i], newCenter) > 0.1) {
                    centersChanged = true;
                }
                centers[i] = newCenter;
            }

            if (!centersChanged) break;
            iterations++;
        }

        return centers;
    }

    samplePixels(pixels, maxPixels) {
        const step = Math.floor(pixels.length / maxPixels);
        const sampled = [];
        for (let i = 0; i < pixels.length; i += step) {
            sampled.push(pixels[i]);
            if (sampled.length >= maxPixels) break;
        }
        return sampled;
    }

    calculateDistance(pixel1, pixel2) {
        return Math.sqrt(
            Math.pow(pixel1[0] - pixel2[0], 2) +
            Math.pow(pixel1[1] - pixel2[1], 2) +
            Math.pow(pixel1[2] - pixel2[2], 2)
        );
    }

    reconstructImage(imageData, centers, k) {
        const compressedData = new ImageData(imageData.width, imageData.height);
        
        for (let i = 0; i < imageData.data.length; i += 4) {
            const pixel = [
                imageData.data[i],     // R
                imageData.data[i + 1], // G
                imageData.data[i + 2]  // B
            ];
            
            let minDistance = Infinity;
            let closestCenter = 0;
            
            for (let j = 0; j < k; j++) {
                const distance = this.calculateDistance(pixel, centers[j]);
                if (distance < minDistance) {
                    minDistance = distance;
                    closestCenter = j;
                }
            }
            
            compressedData.data[i] = centers[closestCenter][0];     // R
            compressedData.data[i + 1] = centers[closestCenter][1]; // G
            compressedData.data[i + 2] = centers[closestCenter][2]; // B
            compressedData.data[i + 3] = imageData.data[i + 3];     // A
        }
        
        return compressedData;
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    calculateCompressionRatio(originalSize, compressedSize) {
        if (originalSize <= 0) return "0.00";
        const ratio = ((originalSize - compressedSize) / originalSize * 100);
        console.log(`压缩比计算: 原始=${originalSize}, 压缩后=${compressedSize}, 压缩比=${ratio.toFixed(2)}%`);
        return ratio.toFixed(2);
    }

    getStrategyDescription(k) {
        const strategies = {
            16: "高压缩率，文件大小最小，但图像质量明显下降，适合快速预览",
            32: "较高压缩率，文件大小显著减小，图像质量略有下降",
            64: "中等压缩率，在文件大小和图像质量之间取得平衡",
            128: "较低压缩率，保持较好的图像质量，适合一般用途",
            256: "低压缩率，保持最佳图像质量，适合高质量输出"
        };
        return strategies[k] || "自定义压缩策略";
    }

    getVisualQuality(k) {
        const qualities = {
            16: "较差",
            32: "一般",
            64: "中等",
            128: "良好",
            256: "优秀"
        };
        return qualities[k] || "未知";
    }
}

class ImageProcessor {
    constructor() {
        this.compressor = new KMeansCompressor();
        this.setupEventListeners();
    }

    setupEventListeners() {
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');

        uploadArea.addEventListener('click', () => fileInput.click());
        uploadArea.addEventListener('dragover', this.handleUploadDragOver.bind(this));
        uploadArea.addEventListener('dragleave', this.handleUploadDragLeave.bind(this));
        uploadArea.addEventListener('drop', this.handleUploadDrop.bind(this));
        fileInput.addEventListener('change', this.handleFileSelect.bind(this));
    }

    handleUploadDragOver(e) {
        e.preventDefault();
        document.getElementById('uploadArea').classList.add('dragover');
    }

    handleUploadDragLeave(e) {
        e.preventDefault();
        document.getElementById('uploadArea').classList.remove('dragover');
    }

    handleUploadDrop(e) {
        e.preventDefault();
        document.getElementById('uploadArea').classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.processFile(files[0]);
        }
    }

    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            this.processFile(file);
        }
    }

    async processFile(file) {
        if (!file.type.startsWith('image/')) {
            this.showError('请选择图片文件');
            return;
        }

        if (file.size > 10 * 1024 * 1024) { // 10MB限制
            this.showError('图片文件过大，请选择小于10MB的图片');
            return;
        }

        this.showLoading();
        
        try {
            const image = await this.loadImage(file);
            this.compressor.originalImage = image;
            
            // 创建canvas用于处理
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = image.width;
            canvas.height = image.height;
            ctx.drawImage(image, 0, 0);
            
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const originalSize = file.size; // 使用实际文件大小
            
            this.displayOriginalImage(image, originalSize);
            
                                // 处理不同K值的压缩
                    const results = [];
                    for (let i = 0; i < this.compressor.kValues.length; i++) {
                        const k = this.compressor.kValues[i];
                        this.updateProgress((i / this.compressor.kValues.length) * 100);
                        
                        // 添加延迟避免阻塞UI
                        await new Promise(resolve => setTimeout(resolve, 10));
                        
                        const compressedData = await this.compressor.compressImage(imageData, k);
                        const compressedSize = await this.estimateCompressedFileSize(compressedData, k);
                        
                        results.push({
                            k: k,
                            compressedData: compressedData,
                            originalSize: originalSize,
                            compressedSize: compressedSize,
                            compressionRatio: this.compressor.calculateCompressionRatio(originalSize, compressedSize)
                        });
                    }
            
            this.updateProgress(100);
            this.displayResults(results);
            
        } catch (error) {
            console.error('处理图片时出错:', error);
            this.showError('处理图片时出错，请重试或选择较小的图片');
        } finally {
            this.hideLoading();
        }
    }

    loadImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const image = new Image();
                image.onload = () => resolve(image);
                image.onerror = reject;
                image.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    estimateFileSize(imageData) {
        // 基于实际图片数据的文件大小估算
        const totalPixels = imageData.width * imageData.height;
        const bytesPerPixel = 3; // RGB
        const estimatedSize = totalPixels * bytesPerPixel;
        
        // 考虑实际文件格式开销（PNG/JPEG头部信息等）
        const formatOverhead = Math.round(estimatedSize * 0.05); // 约5%的格式开销
        
        return estimatedSize + formatOverhead;
    }

    estimateCompressedFileSize(compressedData, k) {
        // 基于实际压缩后的图片数据计算文件大小
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = compressedData.width;
        canvas.height = compressedData.height;
        ctx.putImageData(compressedData, 0, 0);
        
        // 将canvas转换为blob来获取实际文件大小
        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                const actualSize = blob.size;
                console.log(`K=${k}: 实际压缩后大小=${actualSize} bytes`);
                resolve(actualSize);
            }, 'image/png');
        });
    }

    displayOriginalImage(image, originalSize) {
        const compressionResults = document.getElementById('compressionResults');
        
        const originalItem = `
            <div class="compression-item">
                <div class="image-container">
                    <img src="${image.src}" class="image-preview" alt="原始图片" 
                         onclick="openModal(this, '原始图片')">
                    <div class="k-value">原始图片</div>
                    <div class="download-icon" onclick="downloadImage('${image.src}', 'original_image.png')" title="下载图片">
                        ⬇️
                    </div>
                </div>
                
                <div class="compression-stats">
                    <div class="stat-item">
                        <div class="stat-label">尺寸</div>
                        <div class="stat-value">${image.width} × ${image.height}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">文件大小</div>
                        <div class="stat-value">${this.compressor.formatFileSize(originalSize)}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">像素数量</div>
                        <div class="stat-value">${(image.width * image.height).toLocaleString()}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">色彩深度</div>
                        <div class="stat-value">24位 (RGB)</div>
                    </div>
                </div>
                
                <div class="strategy-info">
                    <div class="strategy-title">图片信息</div>
                    <div class="strategy-desc">原始图片，未经压缩处理，保持最佳图像质量</div>
                </div>
            </div>
        `;
        
        compressionResults.innerHTML = originalItem;
    }

    displayResults(results) {
        const resultsSection = document.getElementById('resultsSection');
        const compressionResults = document.getElementById('compressionResults');
        
        resultsSection.style.display = 'block';
        
        const compressedItems = results.map(result => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = result.compressedData.width;
            canvas.height = result.compressedData.height;
            ctx.putImageData(result.compressedData, 0, 0);
            
            return `
                <div class="compression-item">
                    <div class="image-container">
                        <img src="${canvas.toDataURL()}" class="image-preview" alt="压缩图片" 
                             onclick="openModal(this, 'K=${result.k} 压缩图片')">
                        <div class="k-value">K = ${result.k}</div>
                        <div class="download-icon" onclick="downloadImage('${canvas.toDataURL()}', 'compressed_k${result.k}.png')" title="下载图片">
                            ⬇️
                        </div>
                    </div>
                    
                    <div class="compression-stats">
                        <div class="stat-item">
                            <div class="stat-label">压缩前</div>
                            <div class="stat-value">${this.compressor.formatFileSize(result.originalSize)}</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-label">压缩后</div>
                            <div class="stat-value">${this.compressor.formatFileSize(result.compressedSize)}</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-label">压缩比</div>
                            <div class="stat-value">${result.compressionRatio}%</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-label">K值</div>
                            <div class="stat-value">${result.k}</div>
                        </div>
                    </div>
                    
                                    <div class="strategy-info">
                    <div class="strategy-title">压缩信息</div>
                    <div class="strategy-desc">视觉质量：${this.compressor.getVisualQuality(result.k)} | 策略：${this.compressor.getStrategyDescription(result.k)}</div>
                </div>
                </div>
            `;
        }).join('');
        
        // 将压缩结果添加到现有内容后面
        compressionResults.innerHTML += compressedItems;
        
        // 确保每行最多3个项目，添加换行控制
        const items = compressionResults.querySelectorAll('.compression-item');
        items.forEach((item, index) => {
            if (index > 2) {
                // 第二排的项目
                item.style.marginBottom = '0';
            }
        });
    }

    showLoading() {
        document.getElementById('loading').style.display = 'block';
        document.getElementById('resultsSection').style.display = 'none';
        this.hideError();
    }

    hideLoading() {
        document.getElementById('loading').style.display = 'none';
    }

    showError(message) {
        this.hideLoading();
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        document.querySelector('.upload-section').appendChild(errorDiv);
    }

    hideError() {
        const errorDiv = document.querySelector('.error-message');
        if (errorDiv) {
            errorDiv.remove();
        }
    }

    updateProgress(percent) {
        document.getElementById('progressFill').style.width = percent + '%';
    }
}

// 图片放大功能
function openModal(img, title) {
    const modal = document.getElementById('imageModal');
    const modalImg = document.getElementById('modalImage');
    const modalTitle = document.getElementById('modalTitle');
    const comparisonContainer = document.getElementById('comparisonContainer');
    const originalModalImage = document.getElementById('originalModalImage');
    const compressedModalImage = document.getElementById('compressedModalImage');
    const compressedLabel = document.getElementById('compressedLabel');
    
    modal.style.display = 'block';
    modalTitle.textContent = title;
    
    // 检查是否是压缩图片（不是原始图片）
    if (title.includes('K=')) {
        // 显示对比模式
        comparisonContainer.style.display = 'flex';
        modalImg.style.display = 'none';
        
        // 获取原始图片
        const originalImage = document.querySelector('.compression-item:first-child img');
        originalModalImage.src = originalImage.src;
        
        // 设置压缩图片
        compressedModalImage.src = img.src;
        compressedLabel.textContent = title;
    } else {
        // 显示单张图片模式
        comparisonContainer.style.display = 'none';
        modalImg.style.display = 'block';
        modalImg.src = img.src;
    }
}

function closeModal() {
    document.getElementById('imageModal').style.display = 'none';
}

// 点击模态框外部关闭
window.onclick = function(event) {
    const modal = document.getElementById('imageModal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
}

// 下载图片功能
function downloadImage(dataUrl, filename) {
    // 阻止事件冒泡，避免触发图片点击
    event.stopPropagation();
    
    // 创建下载链接
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    
    // 添加到页面并触发下载
    document.body.appendChild(link);
    link.click();
    
    // 清理
    document.body.removeChild(link);
}

// 评分系统
let currentScore = 0;
let hasScored = false;
let flowchartVisible = false;

// 显示答案功能（代码学习页面）
function showAnswer() {
    // 检查当前页面，如果是代码学习页面，使用代码学习的showAnswer逻辑
    const currentPage = document.querySelector('.page-container[style*="display: block"]') || 
                       document.querySelector('.page-container:not([style*="display: none"])');
    
    if (currentPage && currentPage.id === 'page3') {
        // 代码学习页面的showAnswer逻辑
        const fillableElements = document.querySelectorAll('.fillable');
        let correctCount = 0;
        let totalParams = fillableElements.length;
        
        fillableElements.forEach(element => {
            const correctValue = element.getAttribute('data-correct');
            const userValue = element.textContent.trim();
            
            // 显示正确答案
            element.textContent = correctValue;
            element.classList.add('correct');
            element.style.pointerEvents = 'none'; // 禁用编辑
            
            // 检查用户答案是否正确
            if (userValue === correctValue && userValue !== '' && userValue !== '__') {
                correctCount++;
            }
        });
        
        // 计算并显示评分
        const score = calculateScore(correctCount, totalParams);
        displayScore(score, correctCount, totalParams);
        
        hasScored = true;
        
        // 更新按钮文本
        const runBtn = document.querySelector('.run-btn');
        if (runBtn) {
            runBtn.textContent = '重新运行';
            runBtn.style.background = '#ff9800';
        }
    } else {
        // 其他页面的showAnswer逻辑（如第一页的手动计算）
        // 填入所有公式输入框的正确答案
        const formulaInputs = document.querySelectorAll('.formula-input');
        formulaInputs.forEach(input => {
            const correctValue = input.dataset.correct;
            input.value = correctValue;
            input.style.borderColor = '#4CAF50';
            input.style.backgroundColor = 'rgba(76, 175, 80, 0.1)';
        });
        
        // 选择正确的聚类
        const clusterSelect = document.querySelector('.cluster-select');
        if (clusterSelect) {
            const options = clusterSelect.options;
            for (let i = 0; i < options.length; i++) {
                if (options[i].dataset.correct === 'true') {
                    clusterSelect.value = options[i].value;
                    clusterSelect.style.borderColor = '#4CAF50';
                    clusterSelect.style.backgroundColor = 'rgba(76, 175, 80, 0.1)';
                    break;
                }
            }
        }
        
        // 启用下一步按钮
        const nextBtn = document.querySelector('.next-btn');
        if (nextBtn) {
            nextBtn.disabled = false;
        }
        
        // 如果在K-means演示页面，更新相应的步骤信息和按钮状态
        if (kmeansDemo && kmeansDemo.currentStep > 0) {
            kmeansDemo.hasShownAnswer = true; // 标记已显示答案
            // 显示正确的进度信息
            const currentProcessed = kmeansDemo.currentPointIndex + 1;
            const totalPoints = kmeansDemo.points.length;
            kmeansDemo.updateStepInfo(`🎉 计算正确！已处理 ${currentProcessed}/${totalPoints} 个点，点击"下一步"继续`);
            
            // 启用K-means演示页面的下一步按钮
            const kmeansNextBtn = document.querySelector('#page1 .next-btn');
            if (kmeansNextBtn) {
                kmeansNextBtn.disabled = false;
            }
        }
        
        const stepInfo = document.getElementById('stepInfo');
        if (stepInfo) {
            stepInfo.innerHTML = '🎉 答案已显示！点击"下一步"继续';
        }
        
        // 禁用显示答案按钮
        const showAnswerBtn = document.querySelector('.show-answer-btn');
        if (showAnswerBtn) {
            showAnswerBtn.textContent = '✅ 答案已显示';
            showAnswerBtn.disabled = true;
            showAnswerBtn.style.backgroundColor = '#4CAF50';
        }
    }
}

// 运行下一步（评分）功能
function runNextStep() {
    if (hasScored) {
        // 重新开始
        resetCode();
        return;
    }
    
    const fillableElements = document.querySelectorAll('.fillable');
    let correctCount = 0;
    let totalParams = fillableElements.length;
    
    fillableElements.forEach(element => {
        const userValue = element.textContent.trim();
        const correctValue = element.getAttribute('data-correct');
        
        // 检查是否为空或只包含占位符
        if (userValue === '' || userValue === '___' || userValue === '__' || userValue === '    ' || userValue.trim() === '') {
            element.classList.add('incorrect');
            element.classList.remove('correct');
        } else if (userValue === correctValue) {
            element.classList.add('correct');
            element.classList.remove('incorrect');
            correctCount++;
        } else {
            element.classList.add('incorrect');
            element.classList.remove('correct');
        }
    });
    
    // 计算评分
    const score = calculateScore(correctCount, totalParams);
    displayScore(score, correctCount, totalParams);
    
    hasScored = true;
    
    // 更新按钮文本
    const runBtn = document.querySelector('.run-btn');
    runBtn.textContent = '重新运行';
    runBtn.style.background = '#ff9800';
}

// 计算评分
function calculateScore(correctCount, totalParams) {
    if (correctCount === totalParams) {
        return 3; // 3颗星
    } else if (correctCount >= totalParams - 2) {
        return 2; // 2颗星
    } else if (correctCount > 0) {
        return 1; // 1颗星
    } else {
        return 0; // 0颗星
    }
}

// 显示评分
function displayScore(score, correctCount, totalParams) {
    const scoreDisplay = document.getElementById('scoreDisplay');
    const starsContainer = document.getElementById('stars');
    const scoreText = document.getElementById('scoreText');
    const nextPageBtn2 = document.getElementById('nextPageBtn2');
    
    // 生成星星
    starsContainer.innerHTML = '';
    for (let i = 0; i < 3; i++) {
        const star = document.createElement('span');
        star.className = i < score ? 'star' : 'star empty';
        star.textContent = '★';
        starsContainer.appendChild(star);
    }
    
    // 设置评分文本
    const messages = {
        3: '完美！所有参数都正确！',
        2: '很好！大部分参数正确！',
        1: '继续努力！部分参数正确！',
        0: '需要复习！请查看答案学习！'
    };
    
    scoreText.textContent = `${messages[score]} (${correctCount}/${totalParams} 正确)`;
    
    // 只有3星才显示进入第三页按钮
    if (score === 3) {
        nextPageBtn2.style.display = 'inline-block';
    } else {
        nextPageBtn2.style.display = 'none';
    }
    
    scoreDisplay.style.display = 'block';
}

// 切换流程图显示
function toggleFlowchart() {
    const flowchartContainer = document.getElementById('flowchartContainer');
    const flowchartBtn = document.querySelector('.flowchart-btn');
    
    if (flowchartVisible) {
        flowchartContainer.style.display = 'none';
        flowchartBtn.textContent = '📊 实现过程';
        flowchartVisible = false;
    } else {
        flowchartContainer.style.display = 'block';
        flowchartBtn.textContent = '📊 隐藏实现过程';
        flowchartVisible = true;
    }
}

// 显示聚类计算流程
function showClusteringProcess() {
    const clusteringModal = document.getElementById('clusteringModal');
    clusteringModal.style.display = 'block';
}

// 关闭聚类流程模态框
function closeClusteringModal() {
    const clusteringModal = document.getElementById('clusteringModal');
    clusteringModal.style.display = 'none';
}

// 步骤详情数据
const stepDetails = {
    1: {
        title: "📁 步骤1: 读取图像",
        content: `
            <div class="step-detail-section">
                <h4>📖 功能说明</h4>
                <p>使用OpenCV库读取图像文件，将图像数据加载到内存中进行后续处理。</p>
            </div>
            
            <div class="step-detail-section">
                <h4>💻 代码实现</h4>
                <div class="step-detail-code">
<span class="keyword">import</span> cv2<br>
<span class="comment"># 读取图像文件</span><br>
<span class="keyword">def</span> <span class="function">read_image</span>(image_path):<br>
&nbsp;&nbsp;&nbsp;&nbsp;image = cv2.<span class="function">imread</span>(image_path)<br>
&nbsp;&nbsp;&nbsp;&nbsp;<span class="keyword">return</span> image
                </div>
            </div>
            
            <div class="step-detail-section">
                <h4>🔧 参数说明</h4>
                <ul>
                    <li><strong>image_path</strong>: 图像文件路径（支持jpg、png、bmp等格式）</li>
                    <li><strong>返回值</strong>: numpy数组格式的图像数据</li>
                </ul>
            </div>
            
            <div class="step-detail-tips">
                <h5>💡 重要提示</h5>
                <ul>
                    <li>确保图像文件路径正确且文件存在</li>
                    <li>OpenCV读取的图像格式为BGR（蓝绿红）</li>
                    <li>图像数据以numpy数组形式存储</li>
                </ul>
            </div>
        `
    },
    2: {
        title: "🎨 步骤2: 颜色转换",
        content: `
            <div class="step-detail-section">
                <h4>📖 功能说明</h4>
                <p>将OpenCV读取的BGR格式图像转换为RGB格式，因为大多数图像处理算法使用RGB格式。</p>
            </div>
            
            <div class="step-detail-section">
                <h4>💻 代码实现</h4>
                <div class="step-detail-code">
<span class="comment"># BGR转RGB颜色空间</span><br>
image_rgb = cv2.<span class="function">cvtColor</span>(image, cv2.COLOR_BGR2RGB)<br>
<span class="comment"># 现在图像格式为RGB（红绿蓝）</span>
                </div>
            </div>
            
            <div class="step-detail-section">
                <h4>🔧 颜色空间说明</h4>
                <ul>
                    <li><strong>BGR</strong>: OpenCV默认格式（蓝绿红）</li>
                    <li><strong>RGB</strong>: 标准图像格式（红绿蓝）</li>
                    <li><strong>转换原因</strong>: 确保与其他库兼容</li>
                </ul>
            </div>
            
            <div class="step-detail-tips">
                <h5>💡 重要提示</h5>
                <ul>
                    <li>颜色转换不会改变图像内容，只是重新排列颜色通道</li>
                    <li>RGB格式更适合后续的颜色处理算法</li>
                    <li>转换后的图像仍保持原始尺寸和像素数量</li>
                </ul>
            </div>
        `
    },
    3: {
        title: "🔄 步骤3: 数据重塑",
        content: `
            <div class="step-detail-section">
                <h4>📖 功能说明</h4>
                <p>将3D图像数组重塑为2D像素数组，使每个像素的RGB值成为一行数据，便于聚类算法处理。</p>
            </div>
            
            <div class="step-detail-section">
                <h4>💻 代码实现</h4>
                <div class="step-detail-code">
<span class="comment"># 获取图像尺寸</span><br>
height, width, channels = image_rgb.<span class="function">shape</span><br>
<span class="comment"># 重塑为2D数组：(高度×宽度, 3)</span><br>
pixels = image_rgb.<span class="function">reshape</span>(-1, channels)
                </div>
            </div>
            
            <div class="step-detail-section">
                <h4>🔧 数据格式转换</h4>
                <ul>
                    <li><strong>原始格式</strong>: (height, width, 3) - 3D数组</li>
                    <li><strong>重塑后</strong>: (height×width, 3) - 2D数组</li>
                    <li><strong>每行数据</strong>: [R, G, B] 一个像素的颜色值</li>
                </ul>
            </div>
            
            <div class="step-detail-tips">
                <h5>💡 重要提示</h5>
                <ul>
                    <li>reshape(-1, 3)中的-1表示自动计算行数</li>
                    <li>每个像素的RGB值作为一个特征向量</li>
                    <li>这种格式便于K-means算法进行聚类</li>
                </ul>
            </div>
        `
    },
    5: {
        title: "🎯 步骤5: 获取聚类中心",
        content: `
            <div class="step-detail-section">
                <h4>📖 功能说明</h4>
                <p>从训练好的K-means模型中提取聚类中心，这些中心代表压缩后图像将使用的K种主要颜色。</p>
            </div>
            
            <div class="step-detail-section">
                <h4>💻 代码实现</h4>
                <div class="step-detail-code">
<span class="comment"># 获取聚类中心（代表颜色）</span><br>
centers = kmeans.<span class="function">cluster_centers_</span><br>
<span class="comment"># 转换为整数格式</span><br>
centers = centers.<span class="function">astype</span>(np.uint8)
                </div>
            </div>
            
            <div class="step-detail-section">
                <h4>🔧 聚类中心说明</h4>
                <ul>
                    <li><strong>数量</strong>: K个聚类中心，对应K种颜色</li>
                    <li><strong>格式</strong>: 每个中心是[R, G, B]颜色值</li>
                    <li><strong>作用</strong>: 代表该聚类中所有像素的平均颜色</li>
                </ul>
            </div>
            
            <div class="step-detail-tips">
                <h5>💡 重要提示</h5>
                <ul>
                    <li>聚类中心是浮点数，需要转换为0-255的整数</li>
                    <li>每个聚类中心代表一种"代表颜色"</li>
                    <li>K值越大，颜色越丰富，压缩比越小</li>
                </ul>
            </div>
        `
    },
    6: {
        title: "🖼️ 步骤6: 重建图像",
        content: `
            <div class="step-detail-section">
                <h4>📖 功能说明</h4>
                <p>使用聚类中心替换原始像素值，将每个像素替换为其所属聚类的中心颜色，实现图像压缩。</p>
            </div>
            
            <div class="step-detail-section">
                <h4>💻 代码实现</h4>
                <div class="step-detail-code">
<span class="comment"># 用聚类中心替换像素值</span><br>
compressed_pixels = centers[labels]<br>
<span class="comment"># 重塑回原始图像尺寸</span><br>
compressed_image = compressed_pixels.<span class="function">reshape</span>(height, width, channels)
                </div>
            </div>
            
            <div class="step-detail-section">
                <h4>🔧 重建过程</h4>
                <ul>
                    <li><strong>像素替换</strong>: 每个像素用其聚类中心颜色替换</li>
                    <li><strong>尺寸恢复</strong>: 将2D数组重塑回原始3D图像格式</li>
                    <li><strong>压缩效果</strong>: 图像只使用K种颜色，实现压缩</li>
                </ul>
            </div>
            
            <div class="step-detail-tips">
                <h5>💡 重要提示</h5>
                <ul>
                    <li>压缩后的图像保持原始尺寸</li>
                    <li>颜色数量从数百万种减少到K种</li>
                    <li>压缩比取决于K值的大小</li>
                </ul>
            </div>
        `
    }
};

// 显示步骤详情
function showStepDetail(stepNumber) {
    const stepDetail = stepDetails[stepNumber];
    if (!stepDetail) return;
    
    document.getElementById('stepDetailTitle').textContent = stepDetail.title;
    document.getElementById('stepDetailBody').innerHTML = stepDetail.content;
    
    const stepDetailModal = document.getElementById('stepDetailModal');
    stepDetailModal.style.display = 'block';
}

// 关闭步骤详情模态框
function closeStepDetailModal() {
    const stepDetailModal = document.getElementById('stepDetailModal');
    stepDetailModal.style.display = 'none';
}

// 高亮特定步骤
function highlightStep(stepNumber) {
    // 移除所有高亮
    document.querySelectorAll('.process-step').forEach(step => {
        step.classList.remove('highlighted');
        const starBadge = step.querySelector('.star-badge');
        if (starBadge) {
            starBadge.remove();
        }
    });
    
    // 为指定步骤添加高亮
    const targetStep = document.querySelector(`.process-step:nth-child(${stepNumber * 2 - 1})`);
    if (targetStep) {
        targetStep.classList.add('highlighted');
        targetStep.style.position = 'relative';
        
        // 添加星星徽章
        const starBadge = document.createElement('div');
        starBadge.className = 'star-badge';
        starBadge.textContent = '⭐';
        targetStep.appendChild(starBadge);
    }
}

// 移除所有高亮
function removeAllHighlights() {
    document.querySelectorAll('.process-step').forEach(step => {
        step.classList.remove('highlighted');
        const starBadge = step.querySelector('.star-badge');
        if (starBadge) {
            starBadge.remove();
        }
    });
}

// 拖拽排序功能
let draggedItem = null;
let dragSortCompleted = false;
let originalItems = [];

// 初始化拖拽功能
function initDragSort() {
    const dragItems = document.querySelectorAll('.drag-item');
    const dragSlots = document.querySelectorAll('.drag-slot');
    
    // 保存原始顺序
    originalItems = [...dragItems];
    
    // 打乱右侧顺序
    shuffleDragItems();
    
    // 为拖拽项添加事件监听
    dragItems.forEach(item => {
        item.addEventListener('dragstart', handleDragStart);
        item.addEventListener('dragend', handleDragEnd);
    });
    
    // 为拖拽槽添加事件监听
    dragSlots.forEach(slot => {
        slot.addEventListener('dragover', handleSortDragOver);
        slot.addEventListener('dragenter', handleSortDragEnter);
        slot.addEventListener('dragleave', handleSortDragLeave);
        slot.addEventListener('drop', handleSortDrop);
    });
    
    // 为右侧拖拽项容器添加事件监听，以便接收从左侧拖回的步骤
    const dragItemsContainer = document.querySelector('.drag-items');
    dragItemsContainer.addEventListener('dragover', handleSortDragOver);
    dragItemsContainer.addEventListener('dragenter', handleSortDragEnter);
    dragItemsContainer.addEventListener('dragleave', handleSortDragLeave);
    dragItemsContainer.addEventListener('drop', handleSortDrop);
}

// 打乱拖拽项顺序
function shuffleDragItems() {
    const dragItemsContainer = document.querySelector('.drag-items');
    const items = Array.from(dragItemsContainer.children);
    
    // Fisher-Yates 洗牌算法
    for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        dragItemsContainer.appendChild(items[j]);
    }
}

// 拖拽开始
function handleDragStart(e) {
    draggedItem = this;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.outerHTML);
    
    // 记录拖拽源信息
    this.setAttribute('data-drag-source', this.parentElement.classList.contains('drag-slot') ? 'slot' : 'items');
}

// 拖拽结束
function handleDragEnd(e) {
    this.classList.remove('dragging');
    draggedItem = null;
}

// 拖拽悬停
function handleSortDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

// 拖拽进入
function handleSortDragEnter(e) {
    e.preventDefault();
    this.classList.add('drag-over');
}

// 拖拽离开
function handleSortDragLeave(e) {
    // 只有当鼠标真正离开元素时才移除样式
    if (!this.contains(e.relatedTarget)) {
        this.classList.remove('drag-over');
    }
}

// 拖拽放置
function handleSortDrop(e) {
    e.preventDefault();
    this.classList.remove('drag-over');
    
    if (draggedItem) {
        // 检查是否从槽位拖拽到槽位
        const isFromSlot = draggedItem.parentElement.classList.contains('drag-slot');
        const isToSlot = this.classList.contains('drag-slot');
        const isToDragItems = this.classList.contains('drag-items');
        
        if (isFromSlot && isToSlot) {
            // 槽位之间的交换
            const existingItem = this.querySelector('.drag-item');
            
            // 先处理原槽位的状态
            if (existingItem) {
                // 如果目标槽位有内容，进行交换
                draggedItem.parentElement.appendChild(existingItem);
                draggedItem.parentElement.classList.add('filled');
                const originalPlaceholder = draggedItem.parentElement.querySelector('.slot-placeholder');
                if (originalPlaceholder) {
                    originalPlaceholder.style.display = 'none';
                }
            } else {
                // 如果目标槽位为空，清空原槽位状态
                draggedItem.parentElement.classList.remove('filled');
                const originalPlaceholder = draggedItem.parentElement.querySelector('.slot-placeholder');
                if (originalPlaceholder) {
                    originalPlaceholder.style.display = 'block';
                }
            }
            
            // 将拖拽项放置到目标槽位
            this.appendChild(draggedItem);
            this.classList.add('filled');
            
            // 更新目标槽位的占位符
            const placeholder = this.querySelector('.slot-placeholder');
            if (placeholder) {
                placeholder.style.display = 'none';
            }
        } else if (isFromSlot && isToDragItems) {
            // 从槽位拖回右侧
            draggedItem.parentElement.classList.remove('filled');
            const placeholder = draggedItem.parentElement.querySelector('.slot-placeholder');
            if (placeholder) {
                placeholder.style.display = 'block';
            }
            this.appendChild(draggedItem);
        } else if (!isFromSlot && isToSlot) {
            // 从右侧拖到槽位
            // 检查槽是否已有内容
            if (this.children.length > 2) {
                const existingItem = this.querySelector('.drag-item');
                if (existingItem) {
                    // 将现有项目放回右侧
                    const dragItemsContainer = document.querySelector('.drag-items');
                    dragItemsContainer.appendChild(existingItem);
                }
            }
            
            this.appendChild(draggedItem);
            this.classList.add('filled');
            
            // 更新占位符
            const placeholder = this.querySelector('.slot-placeholder');
            if (placeholder) {
                placeholder.style.display = 'none';
            }
        }
    }
}

// 提交拖拽排序
function submitDragSort() {
    const slots = document.querySelectorAll('.drag-slot');
    const userOrder = [];
    let allFilled = true;
    
    slots.forEach(slot => {
        const item = slot.querySelector('.drag-item');
        if (item) {
            userOrder.push(parseInt(item.getAttribute('data-step')));
        } else {
            allFilled = false;
        }
    });
    
    if (!allFilled) {
        alert('请将所有步骤拖拽到对应位置！');
        return;
    }
    
    // 正确答案顺序
    const correctOrder = [1, 2, 3, 4, 5, 6];
    
    // 计算正确数量
    let correctCount = 0;
    for (let i = 0; i < userOrder.length; i++) {
        if (userOrder[i] === correctOrder[i]) {
            correctCount++;
        }
    }
    
    // 显示结果
    showDragResult(correctCount, userOrder.length);
    
    // 如果完全正确，显示代码和流程图
    if (correctCount === userOrder.length) {
        setTimeout(() => {
            showCodeAndFlowchart();
        }, 2000);
    }
}

// 显示拖拽结果
function showDragResult(correctCount, totalCount) {
    const resultDiv = document.getElementById('dragResult');
    const messageDiv = document.getElementById('resultMessage');
    const starsDiv = document.getElementById('resultStars');
    const nextPageBtn = document.getElementById('nextPageBtn');
    
    let message = '';
    let starCount = 0;
    
    if (correctCount === totalCount) {
        message = '🎉 完美！所有步骤都排列正确！';
        starCount = 3;
        // 显示进入下一页按钮
        nextPageBtn.style.display = 'inline-block';
    } else if (correctCount >= totalCount - 2) {
        message = '👍 很好！大部分步骤正确！';
        starCount = 2;
        nextPageBtn.style.display = 'none';
    } else if (correctCount > 0) {
        message = '💪 继续努力！部分步骤正确！';
        starCount = 1;
        nextPageBtn.style.display = 'none';
    } else {
        message = '📚 需要复习！请重新学习算法流程！';
        starCount = 0;
        nextPageBtn.style.display = 'none';
    }
    
    messageDiv.textContent = `${message} (${correctCount}/${totalCount} 正确)`;
    
    // 生成星星
    starsDiv.innerHTML = '';
    for (let i = 0; i < 3; i++) {
        const star = document.createElement('span');
        star.className = i < starCount ? 'result-star' : 'result-star';
        star.textContent = i < starCount ? '★' : '☆';
        star.style.color = i < starCount ? '#ffd700' : '#666';
        starsDiv.appendChild(star);
    }
    
    resultDiv.style.display = 'block';
    dragSortCompleted = true;
}

// 显示代码和流程图
function showCodeAndFlowchart() {
    document.getElementById('codeDescription').style.display = 'block';
    document.getElementById('flowchartContainer').style.display = 'block';
    
    // 滚动到代码区域
    document.querySelector('.code-block').scrollIntoView({ 
        behavior: 'smooth' 
    });
}

// 重置拖拽排序
function resetDragSort() {
    const slots = document.querySelectorAll('.drag-slot');
    const items = document.querySelectorAll('.drag-item');
    
    // 清空所有槽
    slots.forEach(slot => {
        slot.classList.remove('filled', 'drag-over');
        const placeholder = slot.querySelector('.slot-placeholder');
        if (placeholder) {
            placeholder.style.display = 'block';
        }
        const item = slot.querySelector('.drag-item');
        if (item) {
            item.remove();
        }
    });
    
    // 重新添加所有项目到右侧
    const dragItems = document.querySelector('.drag-items');
    items.forEach(item => {
        dragItems.appendChild(item);
    });
    
    // 重新打乱顺序
    shuffleDragItems();
    
    // 隐藏结果和下一页按钮
    document.getElementById('dragResult').style.display = 'none';
    document.getElementById('nextPageBtn').style.display = 'none';
    dragSortCompleted = false;
}

// 进入下一页
function goToNextPage() {
    document.getElementById('page2').style.display = 'none';
    document.getElementById('page3').style.display = 'block';
    
    // 解锁第三页
    unlockPage('page3');
    
    // 更新导航栏状态
    updateNavStatus('page3');
    
    // 滚动到页面顶部
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// 进入第三页
function goToPage3() {
    console.log('进入第四页');
    
    // 隐藏第三页
    const page3 = document.getElementById('page3');
    page3.style.display = 'none';
    
    // 显示第四页
    const page4 = document.getElementById('page4');
    page4.style.display = 'flex';
    page4.style.flexDirection = 'column';
    
    // 解锁第四页
    unlockPage('page4');
    
    // 更新导航栏状态
    updateNavStatus('page4');
    
    console.log('第四页元素:', page4);
    console.log('第四页显示状态:', page4.style.display);
    
    // 滚动到页面顶部
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
    
    // 初始化图片处理器（只在第四页显示时初始化）
    if (!window.imageProcessor) {
        window.imageProcessor = new ImageProcessor();
        console.log('图片处理器已初始化');
    } else {
        console.log('图片处理器已存在');
    }
}

// 重置代码
function resetCode() {
    const fillableElements = document.querySelectorAll('.fillable');
    fillableElements.forEach(element => {
        element.classList.remove('correct', 'incorrect');
        element.style.pointerEvents = 'auto';
        element.textContent = ''; // 清空内容，显示占位符
    });
    
    // 隐藏评分显示和第三页按钮
    document.getElementById('scoreDisplay').style.display = 'none';
    document.getElementById('nextPageBtn2').style.display = 'none';
    
    // 重置按钮
    const runBtn = document.querySelector('.run-btn');
    runBtn.textContent = '运行下一步';
    runBtn.style.background = '#4CAF50';
    
    hasScored = false;
}

// 科学计算器功能
function openCalculator() {
    document.getElementById('calculatorModal').style.display = 'block';
    document.getElementById('calculatorInput').value = '';
}

function closeCalculator() {
    document.getElementById('calculatorModal').style.display = 'none';
}

function addToInput(value) {
    const input = document.getElementById('calculatorInput');
    input.value += value;
}

function addFunction(func) {
    const input = document.getElementById('calculatorInput');
    const currentValue = input.value;
    
    // 检查当前输入是否以数字结尾
    const numberMatch = currentValue.match(/(\d+(?:\.\d+)?)$/);
    
    switch(func) {
        case 'sin':
            if (numberMatch) {
                const number = numberMatch[1];
                const beforeNumber = currentValue.slice(0, -number.length);
                input.value = beforeNumber + 'Math.sin(' + number + ')';
            } else {
                input.value += 'Math.sin()';
                setTimeout(() => {
                    input.focus();
                    const len = input.value.length;
                    input.setSelectionRange(len - 1, len - 1);
                }, 10);
            }
            break;
        case 'cos':
            if (numberMatch) {
                const number = numberMatch[1];
                const beforeNumber = currentValue.slice(0, -number.length);
                input.value = beforeNumber + 'Math.cos(' + number + ')';
            } else {
                input.value += 'Math.cos()';
                setTimeout(() => {
                    input.focus();
                    const len = input.value.length;
                    input.setSelectionRange(len - 1, len - 1);
                }, 10);
            }
            break;
        case 'tan':
            if (numberMatch) {
                const number = numberMatch[1];
                const beforeNumber = currentValue.slice(0, -number.length);
                input.value = beforeNumber + 'Math.tan(' + number + ')';
            } else {
                input.value += 'Math.tan()';
                setTimeout(() => {
                    input.focus();
                    const len = input.value.length;
                    input.setSelectionRange(len - 1, len - 1);
            }, 10);
            }
            break;
        case 'log':
            if (numberMatch) {
                const number = numberMatch[1];
                const beforeNumber = currentValue.slice(0, -number.length);
                input.value = beforeNumber + 'Math.log10(' + number + ')';
            } else {
                input.value += 'Math.log10()';
                setTimeout(() => {
                    input.focus();
                    const len = input.value.length;
                    input.setSelectionRange(len - 1, len - 1);
                }, 10);
            }
            break;
        case 'ln':
            if (numberMatch) {
                const number = numberMatch[1];
                const beforeNumber = currentValue.slice(0, -number.length);
                input.value = beforeNumber + 'Math.log(' + number + ')';
            } else {
                input.value += 'Math.log()';
                setTimeout(() => {
                    input.focus();
                    const len = input.value.length;
                    input.setSelectionRange(len - 1, len - 1);
                }, 10);
            }
            break;
        case 'sqrt':
            if (numberMatch) {
                const number = numberMatch[1];
                const beforeNumber = currentValue.slice(0, -number.length);
                input.value = beforeNumber + 'Math.sqrt(' + number + ')';
            } else {
                input.value += 'Math.sqrt()';
                setTimeout(() => {
                    input.focus();
                    const len = input.value.length;
                    input.setSelectionRange(len - 1, len - 1);
                }, 10);
            }
            break;
        case 'pow':
            input.value += 'Math.pow(, )';
            // 将光标定位到第一个参数位置
            setTimeout(() => {
                input.focus();
                const len = input.value.length;
                input.setSelectionRange(len - 3, len - 3);
            }, 10);
            break;
        case 'pi':
            input.value += 'Math.PI';
            break;
    }
}

function clearInput() {
    document.getElementById('calculatorInput').value = '';
}

function backspace() {
    const input = document.getElementById('calculatorInput');
    input.value = input.value.slice(0, -1);
}

function calculate() {
    const input = document.getElementById('calculatorInput');
    try {
        // 替换一些常见的数学符号
        let expression = input.value
            .replace(/×/g, '*')
            .replace(/÷/g, '/')
            .replace(/π/g, 'Math.PI');
        
        // 安全计算
        const result = eval(expression);
        if (isFinite(result)) {
            // 保留两位小数
            input.value = parseFloat(result.toFixed(2));
        } else {
            input.value = 'Error';
        }
    } catch (error) {
        input.value = 'Error';
    }
}

// 提交手动计算结果
function validateInput(input) {
    const userValue = parseInt(input.value);
    const correctValue = parseInt(input.dataset.correct);
    
    if (isNaN(userValue) || userValue !== correctValue) {
        input.style.borderColor = '#f44336';
        input.style.backgroundColor = 'rgba(244, 67, 54, 0.1)';
    } else {
        input.style.borderColor = '#4CAF50';
        input.style.backgroundColor = 'rgba(76, 175, 80, 0.1)';
    }
    
    // 检查是否所有输入都正确
    checkAllInputsCorrect();
}



function validateClusterSelect(select) {
    if (select.value !== '') {
        const selectedOption = select.options[select.selectedIndex];
        if (selectedOption.dataset.correct === 'true') {
            select.style.borderColor = '#4CAF50';
            select.style.backgroundColor = 'rgba(76, 175, 80, 0.1)';
            
            // 立即分配聚类并更新颜色
            const point = kmeansDemo.points[kmeansDemo.currentPointIndex];
            point.cluster = parseInt(select.value);
            
            // 更新画布，让点立即变色
            kmeansDemo.drawPoints();
            kmeansDemo.drawCentroids();
        } else {
            select.style.borderColor = '#f44336';
            select.style.backgroundColor = 'rgba(244, 67, 54, 0.1)';
        }
    } else {
        select.style.borderColor = '#f44336';
        select.style.backgroundColor = 'rgba(244, 67, 54, 0.1)';
    }
    
    // 检查是否所有输入都正确
    checkAllInputsCorrect();
}

function checkAllInputsCorrect() {
    const formulaInputs = document.querySelectorAll('.formula-input');
    const clusterSelect = document.querySelector('.cluster-select');
    let allCorrect = true;
    
    // 检查所有公式输入
    formulaInputs.forEach(input => {
        const userValue = parseInt(input.value);
        const correctValue = parseInt(input.dataset.correct);
        
        if (isNaN(userValue) || userValue !== correctValue) {
            allCorrect = false;
        }
    });
    
    // 检查聚类选择
    if (clusterSelect.value === '') {
        allCorrect = false;
    } else {
        const selectedOption = clusterSelect.options[clusterSelect.selectedIndex];
        if (selectedOption.dataset.correct !== 'true') {
            allCorrect = false;
        }
    }
    
    // 如果所有输入都正确，启用下一步按钮
    if (allCorrect) {
        document.querySelector('.next-btn').disabled = false;
        const stepInfo = document.getElementById('stepInfo');
        // 显示正确的进度信息
        const currentProcessed = kmeansDemo.currentPointIndex + 1;
        const totalPoints = kmeansDemo.points.length;
        stepInfo.innerHTML = `🎉 计算正确！已处理 ${currentProcessed}/${totalPoints} 个点，点击"下一步"继续`;
        
        // 设置当前点的聚类
        const clusterSelect = document.querySelector('.cluster-select');
        if (clusterSelect && clusterSelect.value !== '') {
            const point = kmeansDemo.points[kmeansDemo.currentPointIndex];
            point.cluster = parseInt(clusterSelect.value);
            
            // 更新画布
            kmeansDemo.drawPoints();
            kmeansDemo.drawCentroids();
        }
    } else {
        document.querySelector('.next-btn').disabled = true;
    }
}

function submitManualCalculation() {
    const formulaInputs = document.querySelectorAll('.formula-input');
    const clusterSelect = document.querySelector('.cluster-select');
    let allCorrect = true;
    
    // 检查所有公式输入
    formulaInputs.forEach(input => {
        const userValue = parseInt(input.value);
        const correctValue = parseInt(input.dataset.correct);
        
        if (isNaN(userValue) || userValue !== correctValue) {
            input.style.borderColor = '#f44336';
            input.style.backgroundColor = 'rgba(244, 67, 54, 0.1)';
            allCorrect = false;
        } else {
            input.style.borderColor = '#4CAF50';
            input.style.backgroundColor = 'rgba(76, 175, 80, 0.1)';
        }
    });
    
    // 检查聚类选择
    if (clusterSelect.value !== '') {
        const selectedOption = clusterSelect.options[clusterSelect.selectedIndex];
        if (selectedOption.dataset.correct === 'true') {
            clusterSelect.style.borderColor = '#4CAF50';
            clusterSelect.style.backgroundColor = 'rgba(76, 175, 80, 0.1)';
        } else {
            clusterSelect.style.borderColor = '#f44336';
            clusterSelect.style.backgroundColor = 'rgba(244, 67, 54, 0.1)';
            allCorrect = false;
        }
    } else {
        clusterSelect.style.borderColor = '#f44336';
        clusterSelect.style.backgroundColor = 'rgba(244, 67, 54, 0.1)';
        allCorrect = false;
    }
    
    if (allCorrect) {
        // 所有答案都正确
        const submitBtn = document.querySelector('.submit-manual-btn');
        submitBtn.textContent = '✅ 答案正确！';
        submitBtn.style.background = '#4CAF50';
        submitBtn.disabled = true;
        
        // 启用下一步按钮
        document.querySelector('.next-btn').disabled = false;
        
        // 显示成功信息
        const stepInfo = document.getElementById('stepInfo');
        const currentProcessed = kmeansDemo.currentPointIndex + 1;
        const totalPoints = kmeansDemo.points.length;
        stepInfo.innerHTML = `🎉 计算正确！已处理 ${currentProcessed}/${totalPoints} 个点，点击"下一步"继续`;
        
        // 更新当前点的聚类
        const point = kmeansDemo.points[kmeansDemo.currentPointIndex];
        point.cluster = parseInt(clusterSelect.value);
        
        // 更新画布
        kmeansDemo.drawPoints();
        kmeansDemo.drawCentroids();
    } else {
        // 有错误答案
        const submitBtn = document.querySelector('.submit-manual-btn');
        submitBtn.textContent = '❌ 答案有误，请重新检查';
        submitBtn.style.background = '#f44336';
        
        setTimeout(() => {
            submitBtn.textContent = '提交答案';
            submitBtn.style.background = '#2196F3';
        }, 2000);
    }
}

// 点击模态框外部关闭
document.addEventListener('click', function(event) {
    const modal = document.getElementById('calculatorModal');
    if (event.target === modal) {
        closeCalculator();
    }
});

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    // 设置全局变量，控制是否自动初始化质心
    autoInitCentroids = false;
    
    // 初始化一维聚类演示功能
    oneDimensionDemo = new OneDimensionKMeansDemo();
    
    // 初始化聚类演示功能
    kmeansDemo = new KMeansDemo();
    
    // 初始化拖拽排序功能
    initDragSort();
    
    // 设置初始导航状态（第零页激活）
    updateNavStatus('page0');
    
    // 解锁所有页面
    unlockPage('page0');
    unlockPage('page1');
    unlockPage('page2');
    unlockPage('page3');
    unlockPage('page4');
    
    // 为可编辑参数添加交互提示
    const fillableElements = document.querySelectorAll('.fillable');
    fillableElements.forEach(element => {
        // 确保初始状态为空
        if (element.textContent.trim() === '___' || element.textContent.trim() === '__' || element.textContent.trim() === '' || element.textContent.trim() === '    ') {
            element.textContent = '';
        }
        
        element.addEventListener('focus', function() {
            this.setAttribute('title', '点击编辑参数值');
            // 如果内容为空或占位符，清空以便输入
            if (this.textContent.trim() === '___' || this.textContent.trim() === '__' || this.textContent.trim() === '' || this.textContent.trim() === '    ') {
                this.textContent = '';
            }
        });
        
        element.addEventListener('blur', function() {
            this.removeAttribute('title');
        });
        
        // 处理输入事件
        element.addEventListener('input', function() {
            if (this.textContent.trim() !== '') {
                this.classList.add('has-content');
            } else {
                this.classList.remove('has-content');
            }
        });
    });
}); 