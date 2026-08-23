// Network Thermal Printer Support (Backend Proxy)
// For printers that require direct TCP/IP connection

import { Router } from 'express';
import net from 'net';

const router = Router();

/**
 * POST /api/print/network
 * Proxy for network thermal printers
 * Sends ESC/POS data directly to printer via TCP/IP
 */
router.post('/network', async (req, res) => {
  try {
    const { printerIP, port = 9100, data } = req.body;

    if (!printerIP || !data) {
      return res.status(400).json({
        success: false,
        message: 'Printer IP and data are required'
      });
    }

    // Create TCP socket to thermal printer
    const client = new net.Socket();
    let success = false;
    let errorMsg = '';

    // Set timeout
    client.setTimeout(5000);

    // Handle connection
    client.connect(port, printerIP, () => {
      console.log(`Connected to thermal printer at ${printerIP}:${port}`);
      
      // Send ESC/POS data
      client.write(data, (err) => {
        if (err) {
          errorMsg = `Write error: ${err.message}`;
          client.destroy();
        } else {
          success = true;
          client.end();
        }
      });
    });

    // Handle data from printer (optional - some printers send status)
    client.on('data', (data) => {
      console.log('Received from printer:', data);
    });

    // Handle errors
    client.on('error', (err) => {
      errorMsg = `Connection error: ${err.message}`;
      console.error('Printer error:', err);
    });

    // Handle timeout
    client.on('timeout', () => {
      errorMsg = 'Connection timeout';
      client.destroy();
    });

    // Handle close
    client.on('close', () => {
      if (success) {
        res.json({
          success: true,
          message: 'Printed successfully'
        });
      } else {
        res.status(500).json({
          success: false,
          message: errorMsg || 'Failed to print'
        });
      }
    });

  } catch (error) {
    console.error('Network print error:', error);
    res.status(500).json({
      success: false,
      message: 'Network printing failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/print/test
 * Test endpoint to check if printer is reachable
 */
router.get('/test/:ip/:port?', async (req, res) => {
  try {
    const { ip } = req.params;
    const port = parseInt(req.params.port || '9100');

    const client = new net.Socket();
    client.setTimeout(3000);

    let isReachable = false;

    client.connect(port, ip, () => {
      isReachable = true;
      client.end();
    });

    client.on('error', () => {
      isReachable = false;
    });

    client.on('close', () => {
      res.json({
        success: true,
        reachable: isReachable,
        message: isReachable 
          ? `Printer at ${ip}:${port} is reachable` 
          : `Cannot reach printer at ${ip}:${port}`
      });
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
