const Order=require('../../models/orderModel')
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const Coupon=require('../../models/couponModel')



exports.generateSalesReport = async (req, res) => {
    try {
        const { startDate, endDate, reportType } = req.body;
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); 
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({ error: 'Invalid start or end date' });
        }
        const orders = await Order.find({
            placedAt: { $gte: start, $lte: end }
        }).populate('user', 'username email')
          .populate('items.product', 'productname category')
          .sort({ placedAt: -1 });
    
        if (orders.length === 0) {
            return res.status(404).json({ message: 'No orders found for the specified date range' });
        }
        const reportData = calculateReportData(orders);
        
        
        reportData.startDate = startDate;
        reportData.endDate = endDate;

        reportData.orders = orders.map(order => ({
            orderId: order.orderId,
            orderDate: order.placedAt,
            userName: order.user ? (order.user.username || order.user.email) : 'Unknown User', 
            items: order.items.map(item => ({
                productName: item.product ? item.product.productname : 'Unknown Product',
                quantity: item.quantity,
                unitPrice: item.price / item.quantity,
                offerPrice: item.discountAmount || item.price,
                lineTotal: (item.discountAmount || item.price)
            })),
            subtotal: order.items.reduce((sum, item) => sum + ((item.discountAmount || item.price)), 0),
            couponCode: order.couponCode || null,
            couponDiscount: order.discountAmount || 0,
            totalAmount: order.totalAmount
        }));
        reportData.recentOrders = orders.slice(0, 5).map(order => ({
            orderId: order.orderId,
            date: order.placedAt.toISOString().split('T')[0],
            status: order.orderStatus
        }));
        if (reportType === 'pdf') {
            const pdfBuffer = await generatePDFReport(reportData);
            res.contentType('application/pdf');
            return res.send(pdfBuffer);
        } else if (reportType === 'excel') {
            const excelBuffer = await generateExcelReport(reportData);
            res.contentType('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            return res.send(excelBuffer);
        } else {
            return res.json(reportData);
        }
    } catch (error) {
        console.error('Error generating report:', error);
        res.status(500).json({ error: 'An error occurred while generating the report', details: error.message });
    }
};


function generatePDFReport(data) {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        let buffers = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
            const pdfData = Buffer.concat(buffers);
            resolve(pdfData);
        });

        // Header
        doc.rect(0, 0, doc.page.width, 40).fill('#1a237e');
        doc.fontSize(16).fillColor('#FFFFFF')
           .text('SALES REPORT', 50, 12, { align: 'center' });
        
        // Date Range
        doc.fontSize(10).fillColor('#000')
           .text(`Period: ${new Date(data.startDate).toLocaleDateString()} - ${new Date(data.endDate).toLocaleDateString()}`, 
                 50, 50, { align: 'right' });

        // Summary Cards
        const summaryY = 70;
        const cardWidth = 158;
        const cardSpacing = 10;
        
        // Total Orders Card
        doc.rect(50, summaryY, cardWidth, 60).fill('#f8f9fa').stroke('#e0e0e0');
        doc.fontSize(12).fillColor('#666')
           .text('TOTAL ORDERS', 60, summaryY + 10);
        doc.fontSize(20).fillColor('#1a237e')
           .text(data.totalOrders.toString(), 60, summaryY + 30);

        // Total Revenue Card
        doc.rect(50 + cardWidth + cardSpacing, summaryY, cardWidth, 60).fill('#f8f9fa').stroke('#e0e0e0');
        doc.fontSize(12).fillColor('#666')
           .text('TOTAL REVENUE', 60 + cardWidth + cardSpacing, summaryY + 10);
        doc.fontSize(20).fillColor('#1a237e')
           .text(`${data.finalTotal.toFixed(2)}`, 60 + cardWidth + cardSpacing, summaryY + 30);

        // Total Savings Card (Offers + Coupons)
        const totalSavings = data.offerDiscount + data.totalCouponDiscount;
        doc.rect(50 + (cardWidth + cardSpacing) * 2, summaryY, cardWidth, 60).fill('#f8f9fa').stroke('#e0e0e0');
        doc.fontSize(12).fillColor('#666')
           .text('TOTAL SAVINGS', 60 + (cardWidth + cardSpacing) * 2, summaryY + 10);
        doc.fontSize(20).fillColor('#2e7d32')  // Green color for savings
           .text(`${totalSavings.toFixed(2)}`, 60 + (cardWidth + cardSpacing) * 2, summaryY + 30);

        doc.moveDown(4);

        // Orders Section with Items Detail
        data.orders.forEach((order, orderIndex) => {
            if (doc.y > 700) doc.addPage();

            // Order Header Box
            const orderY = doc.y;
            doc.rect(50, orderY, 495, 35).fill('#f8f9fa');
            
            // Order Header Info
            doc.fontSize(10).fillColor('#333');
            doc.text(`Order ID: ${order.orderId}`, 60, orderY + 10);
            doc.text(`Date: ${new Date(order.orderDate).toLocaleDateString()}`, 200, orderY + 10);
            doc.text(`Time: ${new Date(order.orderDate).toLocaleTimeString()}`, 340, orderY + 10);
            doc.text(`Customer: ${order.userName}`, 60, orderY + 20);

            doc.moveDown(2);

            // Items Table Header
            const tableTop = doc.y;
            doc.rect(50, tableTop, 495, 20).fill('#e3f2fd');
            
            // Column Headers
            doc.fontSize(9).fillColor('#1a237e');
            doc.text('PRODUCT', 60, tableTop + 6, { width: 200 });
            doc.text('QTY', 270, tableTop + 6, { width: 50, align: 'center' });
            doc.text('UNIT PRICE', 330, tableTop + 6, { width: 80, align: 'right' });
            doc.text('TOTAL', 420, tableTop + 6, { width: 80, align: 'right' });

            // Items Detail
            let currentY = tableTop + 20;
            order.items.forEach((item, index) => {
                doc.rect(50, currentY, 495, 25)
                   .fill(index % 2 === 0 ? '#ffffff' : '#f5f5f5');
                
                doc.fontSize(9).fillColor('#444');
                doc.text(item.productName, 60, currentY + 8, { width: 200 });
                doc.text(item.quantity.toString(), 270, currentY + 8, { width: 50, align: 'center' });
                doc.text(`${item.unitPrice.toFixed(2)}`, 330, currentY + 8, { width: 80, align: 'right' });
                doc.text(`${item.lineTotal.toFixed(2)}`, 420, currentY + 8, { width: 80, align: 'right' });

                currentY += 25;
            });

            // Order Summary Box
            doc.rect(50, currentY, 495, order.couponCode ? 75 : 50).fill('#f8f9fa');
            
            // Summary Details
            doc.fontSize(9).fillColor('#666');
            doc.text('Subtotal:', 350, currentY + 10, { width: 70, align: 'right' });
            doc.fillColor('#333')
               .text(`${order.subtotal.toFixed(2)}`, 420, currentY + 10, { width: 80, align: 'right' });

            if (order.couponCode) {
                doc.fillColor('#666')
                   .text(`Coupon Applied (${order.couponCode}):`, 350, currentY + 25, { width: 70, align: 'right' });
                doc.fillColor('#ff4444')
                   .text(`-${order.couponDiscount.toFixed(2)}`, 420, currentY + 25, { width: 80, align: 'right' });
                currentY += 15;
            }

            doc.fontSize(10).fillColor('#1a237e')
               .text('Total Amount:', 350, currentY + 40, { width: 70, align: 'right' });
            doc.fillColor('#1a237e')
               .text(`${order.totalAmount.toFixed(2)}`, 420, currentY + 40, { width: 80, align: 'right' });

            doc.moveDown(3);
        });

        // Footer
        doc.fontSize(8).fillColor('#666')
           .text(`Generated on: ${new Date().toLocaleString()}`, 50, doc.page.height - 20, 
                { align: 'center', width: 495 });

        doc.end();
    });
}

// Helper function to draw a horizontal line
function generateHr(doc, y) {
    doc.strokeColor('#aaaaaa')
        .lineWidth(1)
        .moveTo(50, y)
        .lineTo(550, y)
        .stroke();
}



async function generateExcelReport(data) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sales Report');

    worksheet.columns = [
        { header: 'Details', key: 'Details', width: 30 },
        { header: 'Value', key: 'value', width: 15 }
    ];

    worksheet.addRows([
        { Details: 'Total Orders', value: data.totalOrders },
        { Details: 'Original Total', value: data.originalTotal },
        { Details: 'Offer Discount', value: data.offerDiscount },
        { Details: 'Total After Offers', value: data.afterOfferTotal },
        { Details: 'Coupon Discount', value: data.totalCouponDiscount },
        { Details: 'Final Total', value: data.finalTotal }
    ]);

    return await workbook.xlsx.writeBuffer();
}

function calculateReportData(orders) {
    let originalTotal = 0;
    let afterOfferTotal = 0;
    let totalCouponDiscount = 0;
    let totalofferDiscount=0
    let finalTotal = 0;

    orders.forEach(order => {
        const originalOrderTotal = order.items.reduce((sum, item) => sum + (item.price), 0);
        const afterOfferOrderTotal = order.items.reduce((sum, item) => 
            sum + ((item.discountAmount || item.price) * item.quantity), 0);
        const couponDiscount = order.discountAmount || 0;
        const offerdiscount = order.offerAmount || 0;
        originalTotal += originalOrderTotal;
        afterOfferTotal += afterOfferOrderTotal;
        totalCouponDiscount += couponDiscount; 
        totalofferDiscount +=offerdiscount; 
        finalTotal += order.totalAmount;
    });
    
    

    return {
        totalOrders: orders.length,
        originalTotal:originalTotal+totalofferDiscount,
        offerDiscount: totalofferDiscount,
        afterOfferTotal,
        totalCouponDiscount,
        finalTotal: afterOfferTotal - totalCouponDiscount 
    };
}



exports.sales_Chart = async (req, res) => {
    try {
      const orderData = await Order.aggregate([
        {
          $group: {
            _id: { $month: "$createdAt" },  
            orderCount: { $sum: 1 }          
          }
        },
        {
          $project: {
            month: {
              $let: {
                vars: {
                  monthsInString: [, 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
                },
                in: {
                  $arrayElemAt: ['$$monthsInString', '$_id']
                }
              }
            },
            orderCount: 1,
            _id: 0
          }
        },
        { $sort: { _id: -1 } },             
        { $limit: 5 },                     
        { $sort: { _id: 1 } }               
      ]);
  
      res.json(orderData);
    } catch (error) {
      console.error('Error fetching order data:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

