import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAccount, useReadContract } from "wagmi";
import WalletConnect from './WalletConnect';

// Required token contract address
const REQUIRED_TOKEN_CONTRACT = '0xea08d82824e871a163fdeb7d7c6000521f1be4dd';
const MINIMUM_TOKEN_BALANCE = 100;

// ERC-20 ABI for balanceOf function
const ERC20_ABI = [
  {
    constant: true,
    inputs: [{ name: '_owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', type: 'uint256' }],
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    type: 'function',
  },
];

// GUGO Assets with safe positioning
const gugoAssets = [
  {
    id: "gugo-cap",
    name: "$GUGO Cap",
    image: "/assets/gugo-cap.png",
    thumbnail: "/assets/gugo-cap.png",
    default: { x: 150, y: 30, scale: 0.3 },
  },
  {
    id: "gugo-helmet",
    name: "GUGO Helmet", 
    image: "/assets/gugo-helmet.png",
    thumbnail: "/assets/gugo-helmet.png",
    default: { x: 140, y: 25, scale: 0.35 },
  },
  {
    id: "gugo-shades",
    name: "Deal With It Shades",
    image: "/assets/gugo-shades.png", 
    thumbnail: "/assets/gugo-shades.png",
    default: { x: 170, y: 120, scale: 0.25 },
  },
  {
    id: "gugo-chain",
    name: "$GUGO Gold Chain",
    image: "/assets/gugo-chain.png",
    thumbnail: "/assets/gugo-chain.png", 
    default: { x: 160, y: 280, scale: 0.3 },
  },
  {
    id: "gugo-hoodie",
    name: `"GUGO enjoyer" Hoodie`,
    image: "/assets/gugo-hoodie.png",
    thumbnail: "/assets/gugo-hoodie.png",
    default: { x: 120, y: 320, scale: 0.4 },
  },
  {
    id: "gugo-sign", 
    name: "Buy $GUGO Sign",
    image: "/assets/gugo-sign.png",
    thumbnail: "/assets/gugo-sign.png",
    default: { x: 350, y: 250, scale: 0.25 },
  },
  {
    id: "gugo-plush",
    name: "Mini GUGO Plush",
    image: "/assets/gugo-plush.png",
    thumbnail: "/assets/gugo-plush.png",
    default: { x: 80, y: 380, scale: 0.25 },
  },
  {
    id: "gugo-speech",
    name: `"GUGO dips" Bubble`,
    image: "/assets/gugo-speech.png",
    thumbnail: "/assets/gugo-speech.png", 
    default: { x: 60, y: 60, scale: 0.3 },
  },
];

export default function BeautifulCustomizer() {
  const { address, isConnected } = useAccount();
  const canvasRef = useRef(null);
  const canvasElRef = useRef(null);
  const [tokenId, setTokenId] = useState('');
  const [nftImageUrl, setNftImageUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [loadedAssets, setLoadedAssets] = useState([]);
  const [debugInfo, setDebugInfo] = useState(null);

  const CANVAS_WIDTH = 600;
  const CANVAS_HEIGHT = 600;

  // Check token balance
  const { 
    data: tokenBalance, 
    isError: balanceError, 
    isLoading: balanceLoading,
    refetch: refetchBalance 
  } = useReadContract({
    address: REQUIRED_TOKEN_CONTRACT,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address],
    enabled: !!address && isConnected,
  });

  // Get token symbol for display
  const { data: tokenSymbol } = useReadContract({
    address: REQUIRED_TOKEN_CONTRACT,
    abi: ERC20_ABI,
    functionName: 'symbol',
    enabled: true,
  });

  // Get token decimals
  const { data: tokenDecimals } = useReadContract({
    address: REQUIRED_TOKEN_CONTRACT,
    abi: ERC20_ABI,
    functionName: 'decimals',
    enabled: true,
  });

  // Calculate if user has enough tokens with better handling
  const hasRequiredTokens = React.useMemo(() => {
    console.log('Debug - Token Balance Check:', {
      tokenBalance: tokenBalance?.toString(),
      tokenDecimals: tokenDecimals?.toString(),
      address,
      isConnected
    });

    if (!tokenBalance) {
      console.log('No token balance found');
      return false;
    }

    // Handle case where decimals might not be available yet
    const decimals = tokenDecimals ? Number(tokenDecimals) : 18; // Default to 18 if not available
    const balance = Number(tokenBalance) / Math.pow(10, decimals);
    
    console.log('Calculated balance:', balance, 'Required:', MINIMUM_TOKEN_BALANCE);
    
    // Update debug info
    setDebugInfo({
      rawBalance: tokenBalance.toString(),
      decimals,
      calculatedBalance: balance,
      hasAccess: balance >= MINIMUM_TOKEN_BALANCE
    });

    return balance >= MINIMUM_TOKEN_BALANCE;
  }, [tokenBalance, tokenDecimals, address, isConnected]);

  // Format token balance for display with better handling
  const formatTokenBalance = React.useMemo(() => {
    if (!tokenBalance) return '0';
    
    const decimals = tokenDecimals ? Number(tokenDecimals) : 18;
    const balance = Number(tokenBalance) / Math.pow(10, decimals);
    
    // Show more precision for small amounts
    if (balance < 1) {
      return balance.toFixed(6);
    } else if (balance < 100) {
      return balance.toFixed(4);
    } else {
      return balance.toFixed(2);
    }
  }, [tokenBalance, tokenDecimals]);

  // Check if user can access the app
  const canAccessApp = isConnected && hasRequiredTokens;

  // Enhanced canvas implementation with resize handles
  useEffect(() => {
    if (!canvasElRef.current) return;

    const canvas = canvasElRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      console.error('Could not get canvas context');
      return;
    }

    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    
    // Store context in ref for access
    canvasRef.current = {
      canvas,
      ctx,
      objects: [],
      backgroundImage: null,
      selectedObject: null,
      isDragging: false,
      isResizing: false,
      resizeHandle: null,
      dragOffset: { x: 0, y: 0 }
    };

    // Initial render
    renderCanvas();
    setupCanvasEvents();

    return () => {
      if (canvasRef.current && canvasRef.current.cleanup) {
        canvasRef.current.cleanup();
      }
    };
  }, []);

  const renderCanvas = useCallback(() => {
    const canvasData = canvasRef.current;
    if (!canvasData || !canvasData.ctx) return;

    const { ctx, backgroundImage, objects, selectedObject } = canvasData;
    
    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Draw background
    if (!backgroundImage) {
      // Beautiful gradient background
      const gradient = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      gradient.addColorStop(0, '#667eea');
      gradient.addColorStop(0.5, '#764ba2');
      gradient.addColorStop(1, '#f093fb');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      // Add stylish text with shadow
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
      
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 28px Inter, Arial, sans-serif';
      ctx.textAlign = 'center';
      
      if (!canAccessApp) {
        ctx.fillText('🔒 Access Restricted', CANVAS_WIDTH/2, CANVAS_HEIGHT/2 - 20);
        ctx.font = '18px Inter, Arial, sans-serif';
        ctx.fillText('Hold $GUGO tokens to access', CANVAS_WIDTH/2, CANVAS_HEIGHT/2 + 20);
      } else {
        ctx.fillText('🐻 Load Your Bearish NFT', CANVAS_WIDTH/2, CANVAS_HEIGHT/2 - 20);
        ctx.font = '18px Inter, Arial, sans-serif';
        ctx.fillText('Enter token ID to start customizing', CANVAS_WIDTH/2, CANVAS_HEIGHT/2 + 20);
      }
      
      // Reset shadow
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    } else if (backgroundImage.complete) {
      ctx.drawImage(backgroundImage, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
    
    // Draw objects
    objects.forEach((obj) => {
      if (obj.img && obj.img.complete) {
        ctx.drawImage(obj.img, obj.left, obj.top, obj.width, obj.height);
        
        // Draw selection border and resize handles for selected object
        if (obj === selectedObject) {
          // Selection border with glow effect
          ctx.shadowColor = '#FFD700';
          ctx.shadowBlur = 8;
          ctx.strokeStyle = '#FFD700';
          ctx.lineWidth = 3;
          ctx.strokeRect(obj.left - 2, obj.top - 2, obj.width + 4, obj.height + 4);
          
          // Reset shadow
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
          
          // Draw resize handles
          const handleSize = 8;
          ctx.fillStyle = '#FFD700';
          ctx.strokeStyle = '#FFA500';
          ctx.lineWidth = 2;
          
          // Corner handles
          const handles = [
            { x: obj.left - handleSize/2, y: obj.top - handleSize/2, cursor: 'nw-resize' },
            { x: obj.left + obj.width - handleSize/2, y: obj.top - handleSize/2, cursor: 'ne-resize' },
            { x: obj.left - handleSize/2, y: obj.top + obj.height - handleSize/2, cursor: 'sw-resize' },
            { x: obj.left + obj.width - handleSize/2, y: obj.top + obj.height - handleSize/2, cursor: 'se-resize' },
          ];
          
          handles.forEach(handle => {
            ctx.fillRect(handle.x, handle.y, handleSize, handleSize);
            ctx.strokeRect(handle.x, handle.y, handleSize, handleSize);
          });
          
          // Store handles for hit detection
          obj.resizeHandles = handles;
        }
      }
    });
  }, [CANVAS_WIDTH, CANVAS_HEIGHT]);

  const setupCanvasEvents = () => {
    const canvas = canvasElRef.current;
    if (!canvas) return;
  
    console.log('Setting up canvas events...');
  
    const getMousePos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = CANVAS_WIDTH / rect.width;
      const scaleY = CANVAS_HEIGHT / rect.height;
      
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
      };
    };
  
    const getResizeHandle = (pos, obj) => {
      if (!obj.resizeHandles) return null;
      
      for (let handle of obj.resizeHandles) {
        if (pos.x >= handle.x && pos.x <= handle.x + 8 &&
            pos.y >= handle.y && pos.y <= handle.y + 8) {
          return handle;
        }
      }
      return null;
    };
  
    const handleMouseDown = (e) => {
      console.log('Mouse down fired, canAccessApp:', canAccessApp);
      // Remove the canAccessApp check here - let it work regardless
      
      const canvasData = canvasRef.current;
      if (!canvasData) return;
  
      const pos = getMousePos(e);
      console.log('Mouse down at:', pos);
      
      // Check for resize handle first
      if (canvasData.selectedObject) {
        const handle = getResizeHandle(pos, canvasData.selectedObject);
        if (handle) {
          canvasData.isResizing = true;
          canvasData.resizeHandle = handle;
          canvasData.initialSize = {
            width: canvasData.selectedObject.width,
            height: canvasData.selectedObject.height,
            left: canvasData.selectedObject.left,
            top: canvasData.selectedObject.top
          };
          canvasData.initialMouse = pos;
          return;
        }
      }
      
      // Find clicked object
      canvasData.selectedObject = null;
      for (let i = canvasData.objects.length - 1; i >= 0; i--) {
        const obj = canvasData.objects[i];
        if (pos.x >= obj.left && pos.x <= obj.left + obj.width &&
            pos.y >= obj.top && pos.y <= obj.top + obj.height) {
          canvasData.selectedObject = obj;
          canvasData.isDragging = true;
          canvasData.dragOffset = {
            x: pos.x - obj.left,
            y: pos.y - obj.top
          };
          console.log('Selected object:', obj.assetName);
          break;
        }
      }
      renderCanvas();
    };
  
    const handleMouseMove = (e) => {
      // Remove canAccessApp check here too
      
      const canvasData = canvasRef.current;
      if (!canvasData) return;
  
      const pos = getMousePos(e);
  
      if (canvasData.isResizing && canvasData.selectedObject && canvasData.resizeHandle) {
        const obj = canvasData.selectedObject;
        const handle = canvasData.resizeHandle;
        const initial = canvasData.initialSize;
        const initialMouse = canvasData.initialMouse;
        
        const deltaX = pos.x - initialMouse.x;
        const deltaY = pos.y - initialMouse.y;
        
        // Calculate new dimensions based on handle position
        let newWidth = initial.width;
        let newHeight = initial.height;
        let newLeft = initial.left;
        let newTop = initial.top;
        
        if (handle.cursor === 'se-resize') {
          newWidth = Math.max(20, initial.width + deltaX);
          newHeight = Math.max(20, initial.height + deltaY);
        } else if (handle.cursor === 'sw-resize') {
          newWidth = Math.max(20, initial.width - deltaX);
          newHeight = Math.max(20, initial.height + deltaY);
          newLeft = initial.left + (initial.width - newWidth);
        } else if (handle.cursor === 'ne-resize') {
          newWidth = Math.max(20, initial.width + deltaX);
          newHeight = Math.max(20, initial.height - deltaY);
          newTop = initial.top + (initial.height - newHeight);
        } else if (handle.cursor === 'nw-resize') {
          newWidth = Math.max(20, initial.width - deltaX);
          newHeight = Math.max(20, initial.height - deltaY);
          newLeft = initial.left + (initial.width - newWidth);
          newTop = initial.top + (initial.height - newHeight);
        }
        
        // Apply constraints
        newWidth = Math.min(newWidth, CANVAS_WIDTH - newLeft);
        newHeight = Math.min(newHeight, CANVAS_HEIGHT - newTop);
        newLeft = Math.max(0, newLeft);
        newTop = Math.max(0, newTop);
        
        obj.width = newWidth;
        obj.height = newHeight;
        obj.left = newLeft;
        obj.top = newTop;
        
        renderCanvas();
        canvas.style.cursor = handle.cursor;
        
      } else if (canvasData.isDragging && canvasData.selectedObject) {
        const obj = canvasData.selectedObject;
        obj.left = Math.max(0, Math.min(CANVAS_WIDTH - obj.width, pos.x - canvasData.dragOffset.x));
        obj.top = Math.max(0, Math.min(CANVAS_HEIGHT - obj.height, pos.y - canvasData.dragOffset.y));
        renderCanvas();
        canvas.style.cursor = 'grabbing';
      } else {
        // Update cursor based on what's under mouse
        let newCursor = 'default';
        
        // Check for resize handles first
        if (canvasData.selectedObject) {
          const handle = getResizeHandle(pos, canvasData.selectedObject);
          if (handle) {
            newCursor = handle.cursor;
          }
        }
        
        // Check for objects if no handle
        if (newCursor === 'default') {
          for (let i = canvasData.objects.length - 1; i >= 0; i--) {
            const obj = canvasData.objects[i];
            if (pos.x >= obj.left && pos.x <= obj.left + obj.width &&
                pos.y >= obj.top && pos.y <= obj.top + obj.height) {
              newCursor = 'grab';
              break;
            }
          }
        }
        
        canvas.style.cursor = newCursor;
      }
    };
  
    const handleMouseUp = () => {
      const canvasData = canvasRef.current;
      if (!canvasData) return;
  
      canvasData.isDragging = false;
      canvasData.isResizing = false;
      canvasData.resizeHandle = null;
      canvas.style.cursor = 'default';
    };
  
    // Force attach the event listeners
    canvas.addEventListener('mousedown', handleMouseDown, true);
    canvas.addEventListener('mousemove', handleMouseMove, true);
    canvas.addEventListener('mouseup', handleMouseUp, true);
    canvas.addEventListener('mouseleave', handleMouseUp, true);
  
    console.log('Event listeners attached');
  
    // Store cleanup function
    canvasRef.current.cleanup = () => {
      canvas.removeEventListener('mousedown', handleMouseDown, true);
      canvas.removeEventListener('mousemove', handleMouseMove, true);
      canvas.removeEventListener('mouseup', handleMouseUp, true);
      canvas.removeEventListener('mouseleave', handleMouseUp, true);
    };
  };

  // Debug function - add this temporarily
const debugCanvas = () => {
  console.log('=== CANVAS DEBUG ===');
  console.log('Canvas element:', canvasElRef.current);
  console.log('Canvas ref data:', canvasRef.current);
  console.log('Can access app:', canAccessApp);
  console.log('Has NFT loaded:', !!nftImageUrl);
  console.log('Loaded assets:', loadedAssets.length);
  
  if (canvasElRef.current) {
    console.log('Canvas has event listeners:', {
      onclick: !!canvasElRef.current.onclick,
      onmousedown: !!canvasElRef.current.onmousedown,
      onmousemove: !!canvasElRef.current.onmousemove,
    });
  }
};

// Add this to a button for testing

  const fetchNftImage = async (tokenId) => {
    if (!tokenId.trim()) {
      alert('Please enter a valid token ID');
      return;
    }

    if (!canAccessApp) {
      alert('You need to hold at least 100 $GUGO token to use this app!');
      return;
    }

    try {
      setIsLoading(true);
      
      const response = await fetch(`/api/opensea?tokenId=${encodeURIComponent(tokenId)}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch NFT');
      }
      
      const imageUrl = data.image_url;
      setNftImageUrl(imageUrl);
      
      if (canvasRef.current && imageUrl) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          canvasRef.current.backgroundImage = img;
          canvasRef.current.objects = [];
          canvasRef.current.selectedObject = null;
          setLoadedAssets([]);
          renderCanvas();
        };
        img.onerror = () => {
          alert('Failed to load NFT image');
        };
        img.src = `/api/image-proxy?url=${encodeURIComponent(imageUrl)}`;
      }

    } catch (err) {
      console.error('Failed to fetch NFT:', err);
      alert(`Failed to fetch NFT: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddAsset = (asset) => {
    if (!canAccessApp) {
      alert('You need to hold at least 100 $GUGO token to use this app!');
      return;
    }

    if (!canvasRef.current || !nftImageUrl) {
      alert('Please load an NFT first!');
      return;
    }

    const existingAsset = loadedAssets.find(a => a.id === asset.id);
    if (existingAsset) {
      alert('Asset already added! Click on it to select and resize.');
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const obj = {
        img: img,
        left: asset.default.x,
        top: asset.default.y,
        width: img.naturalWidth * asset.default.scale,
        height: img.naturalHeight * asset.default.scale,
        assetId: asset.id,
        assetName: asset.name
      };
      
      canvasRef.current.objects.push(obj);
      canvasRef.current.selectedObject = obj;
      setLoadedAssets(prev => [...prev, asset]);
      setSelectedAsset(asset);
      renderCanvas();
    };
    img.onerror = () => {
      alert('Failed to load asset image');
    };
    img.src = asset.image;
  };

  const handleRemoveAsset = (assetId) => {
    if (!canvasRef.current) return;
    
    const index = canvasRef.current.objects.findIndex(obj => obj.assetId === assetId);
    if (index > -1) {
      const removedObj = canvasRef.current.objects[index];
      canvasRef.current.objects.splice(index, 1);
      if (canvasRef.current.selectedObject === removedObj) {
        canvasRef.current.selectedObject = null;
      }
      renderCanvas();
    }
    
    setLoadedAssets(prev => prev.filter(asset => asset.id !== assetId));
    setSelectedAsset(null);
  };

  const handleReset = () => {
    if (!nftImageUrl || !canvasRef.current) return;
    
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      canvasRef.current.backgroundImage = img;
      canvasRef.current.objects = [];
      canvasRef.current.selectedObject = null;
      setLoadedAssets([]);
      setSelectedAsset(null);
      renderCanvas();
    };
    img.src = `/api/image-proxy?url=${encodeURIComponent(nftImageUrl)}`;
  };

  const handleDownload = () => {
    if (!canvasRef.current) return;
    
    const dataURL = canvasRef.current.canvas.toDataURL('image/png', 1);
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = `bearish-gugo-custom-${tokenId || Date.now()}.png`;
    link.click();
  };

  // Re-render canvas when access status changes
  useEffect(() => {
    if (canvasRef.current) {
      renderCanvas();
    }
  }, [canAccessApp, renderCanvas]);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
    }}>
      {/* Animated Header */}
      <div style={{
        background: 'linear-gradient(45deg, #FF6B6B, #4ECDC4, #45B7D1, #96CEB4, #FFEAA7, #DDA0DD)',
        backgroundSize: '400% 400%',
        animation: 'gradientShift 8s ease infinite',
        padding: '2rem 0',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <style>{`
          @keyframes gradientShift {
            0% { background-position: 0% 50%; }
            25% { background-position: 100% 50%; }
            50% { background-position: 100% 100%; }
            75% { background-position: 0% 100%; }
            100% { background-position: 0% 50%; }
          }
          
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
          }
          
          .floating { animation: float 3s ease-in-out infinite; }
        `}</style>
        
        {/* Wallet Connection - Positioned in top right */}
        <div style={{
          position: 'absolute',
          top: '1rem',
          right: '2rem',
          zIndex: 20
        }}>
          <WalletConnect />
        </div>
        
        <div style={{ position: 'relative', zIndex: 10, marginTop: '2rem' }}>
          <h1 style={{
            fontSize: '4rem',
            fontWeight: '900',
            color: 'white',
            margin: '0 0 1rem 0',
            textShadow: '4px 4px 8px rgba(0,0,0,0.5)',
            filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.3))'
          }} className="floating">
            🐻 BEARISH × GUGO 🧢
          </h1>
          <p style={{
            fontSize: '1.5rem',
            color: 'white',
            margin: 0,
            fontWeight: '600',
            opacity: 0.95
          }}>
            Premium NFT Customization on Abstract
          </p>
          <div style={{
            width: '150px',
            height: '4px',
            background: 'rgba(255,255,255,0.8)',
            borderRadius: '2px',
            margin: '1.5rem auto 0',
            boxShadow: '0 2px 10px rgba(255,255,255,0.3)'
          }}></div>
        </div>
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
        {/* Enhanced Token Balance Status */}
        {isConnected && (
          <div style={{
            background: hasRequiredTokens 
              ? 'linear-gradient(135deg, #ECFDF5, #D1FAE5)' 
              : 'linear-gradient(135deg, #FEF2F2, #FECACA)',
            border: `2px solid ${hasRequiredTokens ? '#10B981' : '#EF4444'}`,
            borderRadius: '16px',
            padding: '1.5rem',
            marginBottom: '2rem',
            textAlign: 'center'
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                fontSize: '2rem'
              }}>
                {balanceLoading ? '⏳' : hasRequiredTokens ? '✅' : '❌'}
              </div>
              <div>
                <h3 style={{
                  color: hasRequiredTokens ? '#065F46' : '#991B1B',
                  fontWeight: '700',
                  margin: '0 0 0.5rem 0',
                  fontSize: '1.2rem'
                }}>
                  {balanceLoading 
                    ? 'Checking $GUGO Balance...'
                    : hasRequiredTokens 
                    ? 'Access Granted! 🎉' 
                    : 'Access Denied - Need $GUGO Tokens'}
                </h3>
                <p style={{
                  color: hasRequiredTokens ? '#047857' : '#7F1D1D',
                  margin: 0,
                  fontWeight: '600'
                }}>
                  {balanceLoading 
                    ? 'Please wait...'
                    : `You have ${formatTokenBalance} $GUGO • Required: ${MINIMUM_TOKEN_BALANCE} minimum`
                  }
                </p>
                {/* Debug Info for Development */}
                {debugInfo && process.env.NODE_ENV === 'development' && (
                  <details style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#666' }}>
                    <summary>Debug Info (Dev Mode)</summary>
                    <pre style={{ textAlign: 'left', fontSize: '0.7rem', margin: '0.5rem 0' }}>
                      Raw Balance: {debugInfo.rawBalance}
                      Decimals: {debugInfo.decimals}
                      Calculated: {debugInfo.calculatedBalance}
                      Has Access: {debugInfo.hasAccess.toString()}
                      Contract: {REQUIRED_TOKEN_CONTRACT}
                    </pre>
                  </details>
                )}
              </div>
              {!hasRequiredTokens && !balanceLoading && (
                <button
                  onClick={() => refetchBalance()}
                  style={{
                    background: '#3B82F6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.5rem 1rem',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = '#2563EB';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = '#3B82F6';
                  }}
                >
                  🔄 Refresh Balance
                </button>
              )}
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
          
          {/* Canvas Section */}
          <div>
            <div style={{
              background: 'rgba(255,255,255,0.95)',
              borderRadius: '24px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden',
              backdropFilter: 'blur(10px)',
              opacity: canAccessApp ? 1 : 0.6,
              filter: canAccessApp ? 'none' : 'grayscale(50%)',
              transition: 'all 0.3s ease'
            }}>
              
              {/* Control Panel */}
              <div style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                padding: '2rem'
              }}>
                {/* Access Status Indicator */}
                {!canAccessApp && (
                  <div style={{
                    background: 'rgba(239, 68, 68, 0.9)',
                    border: '2px solid #DC2626',
                    borderRadius: '12px',
                    padding: '1rem',
                    marginBottom: '1.5rem',
                    textAlign: 'center'
                  }}>
                    <p style={{
                      color: 'white',
                      fontWeight: '700',
                      margin: 0,
                      fontSize: '1rem'
                    }}>
                      🔒 Hold at least 100 $GUGO token to access this premium customizer
                    </p>
                  </div>
                )}
                
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="Enter Bearish Token ID (e.g., 1, 100, 1234)"
                    value={tokenId}
                    onChange={(e) => setTokenId(e.target.value)}
                    disabled={!canAccessApp}
                    style={{
                      flex: 1,
                      padding: '1rem 1.5rem',
                      fontSize: '1.1rem',
                      border: 'none',
                      borderRadius: '16px',
                      background: canAccessApp ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.5)',
                      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)',
                      outline: 'none',
                      transition: 'all 0.3s ease',
                      opacity: canAccessApp ? 1 : 0.6,
                      cursor: canAccessApp ? 'text' : 'not-allowed'
                    }}
                    onFocus={(e) => {
                      if (canAccessApp) {
                        e.target.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.1), 0 0 0 3px rgba(255,255,255,0.3)';
                      }
                    }}
                    onBlur={(e) => {
                      e.target.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.1)';
                    }}
                  />
                  <button
                    onClick={() => fetchNftImage(tokenId)}
                    disabled={isLoading || !canAccessApp}
                    style={{
                      padding: '1rem 2rem',
                      fontSize: '1.1rem',
                      fontWeight: '700',
                      border: 'none',
                      borderRadius: '16px',
                      background: (isLoading || !canAccessApp)
                        ? 'linear-gradient(45deg, #ccc, #999)' 
                        : 'linear-gradient(45deg, #FFD700, #FFA500)',
                      color: '#333',
                      cursor: (isLoading || !canAccessApp) ? 'not-allowed' : 'pointer',
                      boxShadow: '0 8px 16px rgba(255,215,0,0.3)',
                      transition: 'all 0.3s ease',
                      transform: (isLoading || !canAccessApp) ? 'scale(0.98)' : 'scale(1)',
                      opacity: canAccessApp ? 1 : 0.6
                    }}
                    onMouseEnter={(e) => {
                      if (!isLoading && canAccessApp) {
                        e.target.style.transform = 'scale(1.05)';
                        e.target.style.boxShadow = '0 12px 24px rgba(255,215,0,0.4)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isLoading && canAccessApp) {
                        e.target.style.transform = 'scale(1)';
                        e.target.style.boxShadow = '0 8px 16px rgba(255,215,0,0.3)';
                      }
                    }}
                  >
                    {isLoading ? '🔄 Loading...' : '🐻 Load Bearish NFT'}
                  </button>
                </div>
              </div>

              {/* Canvas Area */}
              <div style={{ padding: '2rem', background: '#f8fafc' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
                <canvas
                  ref={canvasElRef}
                  style={{
                    borderRadius: '20px',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
                    border: '4px solid rgba(255,255,255,0.8)',
                    background: 'white',
                    maxWidth: '100%',
                    aspectRatio: '1/1',  // ← Add this line
                    cursor: canAccessApp ? 'default' : 'not-allowed'
                  }}
                />
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '2rem' }}>
                  <button
                    onClick={handleReset}
                    disabled={!nftImageUrl || !canAccessApp}
                    style={{
                      padding: '0.75rem 1.5rem',
                      fontSize: '1rem',
                      fontWeight: '600',
                      border: 'none',
                      borderRadius: '12px',
                      background: 'linear-gradient(45deg, #6B7280, #4B5563)',
                      color: 'white',
                      cursor: (!nftImageUrl || !canAccessApp) ? 'not-allowed' : 'pointer',
                      opacity: (!nftImageUrl || !canAccessApp) ? 0.5 : 1,
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (nftImageUrl && canAccessApp) {
                        e.target.style.transform = 'scale(1.05)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (nftImageUrl && canAccessApp) {
                        e.target.style.transform = 'scale(1)';
                      }
                    }}
                  >
                    🔄 Reset Canvas
                  </button>
                  <button
                    onClick={handleDownload}
                    disabled={!nftImageUrl || !canAccessApp}
                    style={{
                      padding: '0.75rem 2rem',
                      fontSize: '1rem',
                      fontWeight: '700',
                      border: 'none',
                      borderRadius: '12px',
                      background: 'linear-gradient(45deg, #10B981, #059669)',
                      color: 'white',
                      cursor: (!nftImageUrl || !canAccessApp) ? 'not-allowed' : 'pointer',
                      opacity: (!nftImageUrl || !canAccessApp) ? 0.5 : 1,
                      boxShadow: '0 8px 16px rgba(16,185,129,0.3)',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (nftImageUrl && canAccessApp) {
                        e.target.style.transform = 'scale(1.05)';
                        e.target.style.boxShadow = '0 12px 24px rgba(16,185,129,0.4)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (nftImageUrl && canAccessApp) {
                        e.target.style.transform = 'scale(1)';
                        e.target.style.boxShadow = '0 8px 16px rgba(16,185,129,0.3)';
                      }
                    }}
                  >
                    💾 Download Masterpiece
                  </button>
                </div>

                <button
                  onClick={debugCanvas}
                  style={{
                    padding: '0.75rem 1.5rem',
                    fontSize: '1rem',
                    fontWeight: '600',
                    border: '2px solid #FF0000',
                    borderRadius: '12px',
                    background: '#FF0000',
                    color: 'white',
                    cursor: 'pointer',
                  }}
                >
                🐛 Debug Canvas
                </button>

                {/* Active Assets Display */}
                {loadedAssets.length > 0 && (
                  <div style={{
                    background: 'linear-gradient(135deg, #EBF8FF, #BEE3F8)',
                    border: '2px solid #3182CE',
                    borderRadius: '16px',
                    padding: '1.5rem'
                  }}>
                    <h4 style={{
                      fontWeight: '700',
                      color: '#1E40AF',
                      marginBottom: '1rem',
                      fontSize: '1.1rem'
                    }}>
                      🎨 Active Assets ({loadedAssets.length}):
                    </h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                      {loadedAssets.map((asset, index) => (
                        <div key={index} style={{
                          display: 'flex',
                          alignItems: 'center',
                          background: 'rgba(255,255,255,0.8)',
                          padding: '0.5rem 1rem',
                          borderRadius: '8px',
                          border: '1px solid #3182CE'
                        }}>
                          <span style={{ 
                            fontWeight: '500', 
                            color: '#1E40AF',
                            fontSize: '0.9rem'
                          }}>
                            {asset.name}
                          </span>
                          <button
                            onClick={() => handleRemoveAsset(asset.id)}
                            style={{
                              marginLeft: '0.5rem',
                              width: '20px',
                              height: '20px',
                              background: '#EF4444',
                              color: 'white',
                              border: 'none',
                              borderRadius: '50%',
                              fontSize: '12px',
                              fontWeight: '700',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.background = '#DC2626';
                              e.target.style.transform = 'scale(1.1)';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.background = '#EF4444';
                              e.target.style.transform = 'scale(1)';
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                    <p style={{
                      color: '#1D4ED8',
                      fontSize: '0.9rem',
                      margin: 0,
                      fontWeight: '500'
                    }}>
                      💡 Click assets to select • Drag to move • Use corner handles to resize
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Assets Panel */}
          <div>
            <div style={{
              background: 'rgba(255,255,255,0.95)',
              borderRadius: '24px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden',
              backdropFilter: 'blur(10px)',
              height: 'fit-content',
              opacity: canAccessApp ? 1 : 0.6,
              filter: canAccessApp ? 'none' : 'grayscale(50%)',
              transition: 'all 0.3s ease'
            }}>
              <div style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                padding: '2rem',
                textAlign: 'center'
              }}>
                <h2 style={{
                  fontSize: '1.8rem',
                  fontWeight: '900',
                  color: 'white',
                  margin: '0 0 0.5rem 0',
                  textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
                }}>
                  🎨 GUGO Assets
                </h2>
                <p style={{
                  color: 'rgba(255,255,255,0.9)',
                  margin: 0,
                  fontSize: '1.1rem',
                  fontWeight: '500'
                }}>
                  Premium Collection
                </p>
              </div>

              <div style={{ padding: '1.5rem' }}>
                {/* Enhanced Token Requirement Status for Assets */}
                {!canAccessApp && (
                  <div style={{
                    background: 'linear-gradient(135deg, #FEF2F2, #FECACA)',
                    border: '2px solid #EF4444',
                    borderRadius: '16px',
                    padding: '1.5rem',
                    marginBottom: '1.5rem',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔒</div>
                    <p style={{
                      color: '#991B1B',
                      fontWeight: '700',
                      margin: '0 0 0.5rem 0',
                      fontSize: '1rem'
                    }}>
                      $GUGO Token Required
                    </p>
                    <p style={{
                      color: '#7F1D1D',
                      fontSize: '0.9rem',
                      margin: 0,
                      opacity: 0.8
                    }}>
                      Hold at least {MINIMUM_TOKEN_BALANCE} $GUGO token to unlock premium assets
                    </p>
                    {!isConnected && (
                      <p style={{
                        color: '#7F1D1D',
                        fontSize: '0.8rem',
                        margin: '0.5rem 0 0 0',
                        fontStyle: 'italic'
                      }}>
                        Connect your wallet first
                      </p>
                    )}
                  </div>
                )}

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '1rem',
                  maxHeight: '500px',
                  overflowY: 'auto'
                }}>
                  {gugoAssets.map((asset) => {
                    const isAdded = loadedAssets.some(a => a.id === asset.id);
                    const isDisabled = !canAccessApp || !nftImageUrl;
                    
                    return (
                      <div key={asset.id} style={{ position: 'relative' }}>
                        <button
                          onClick={() => handleAddAsset(asset)}
                          disabled={isAdded || isDisabled}
                          style={{
                            width: '100%',
                            padding: '1rem',
                            borderRadius: '16px',
                            border: `2px solid ${
                              isAdded 
                                ? '#10B981' 
                                : !canAccessApp
                                ? '#EF4444'
                                : isDisabled
                                ? '#D1D5DB'
                                : '#E5E7EB'
                            }`,
                            background: isAdded 
                              ? 'linear-gradient(135deg, #ECFDF5, #D1FAE5)'
                              : !canAccessApp
                              ? 'linear-gradient(135deg, #FEF2F2, #FECACA)'
                              : isDisabled
                              ? '#F9FAFB'
                              : 'white',
                            cursor: (isAdded || isDisabled) ? 'not-allowed' : 'pointer',
                            opacity: isDisabled ? 0.5 : 1,
                            transition: 'all 0.3s ease',
                            boxShadow: isAdded 
                              ? '0 0 20px rgba(16,185,129,0.3)' 
                              : !canAccessApp
                              ? '0 0 20px rgba(239,68,68,0.2)'
                              : '0 4px 12px rgba(0,0,0,0.1)'
                          }}
                          onMouseEnter={(e) => {
                            if (!isAdded && canAccessApp && nftImageUrl) {
                              e.target.style.transform = 'scale(1.05)';
                              e.target.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
                              e.target.style.borderColor = '#FFD700';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isAdded && canAccessApp && nftImageUrl) {
                              e.target.style.transform = 'scale(1)';
                              e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                              e.target.style.borderColor = '#E5E7EB';
                            }
                          }}
                        >
                          <div style={{
                            width: '60px',
                            height: '60px',
                            background: '#F3F4F6',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                            margin: '0 auto 1rem auto',
                            border: '2px solid rgba(255,255,255,0.8)',
                            filter: canAccessApp ? 'none' : 'grayscale(100%)'
                          }}>
                            <img 
                              src={asset.thumbnail} 
                              alt={asset.name}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                transition: 'transform 0.3s ease'
                              }}
                              onMouseEnter={(e) => {
                                if (!isAdded && canAccessApp && nftImageUrl) {
                                  e.target.style.transform = 'scale(1.1)';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isAdded && canAccessApp && nftImageUrl) {
                                  e.target.style.transform = 'scale(1)';
                                }
                              }}
                            />
                          </div>
                          <span style={{
                            fontSize: '0.85rem',
                            fontWeight: '600',
                            color: isAdded 
                              ? '#065F46' 
                              : !canAccessApp 
                              ? '#991B1B' 
                              : isDisabled 
                              ? '#9CA3AF' 
                              : '#374151',
                            display: 'block',
                            textAlign: 'center',
                            lineHeight: '1.2'
                          }}>
                            {isAdded 
                              ? '✅ Added' 
                              : !canAccessApp 
                              ? '🔒 Locked' 
                              : asset.name
                            }
                          </span>
                        </button>
                        
                        {isAdded && (
                          <button
                            onClick={() => handleRemoveAsset(asset.id)}
                            style={{
                              position: 'absolute',
                              top: '-8px',
                              right: '-8px',
                              width: '24px',
                              height: '24px',
                              background: '#EF4444',
                              color: 'white',
                              border: 'none',
                              borderRadius: '50%',
                              fontSize: '14px',
                              fontWeight: '700',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: '0 2px 8px rgba(239,68,68,0.4)',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.background = '#DC2626';
                              e.target.style.transform = 'scale(1.1)';
                              e.target.style.boxShadow = '0 4px 12px rgba(220,38,38,0.5)';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.background = '#EF4444';
                              e.target.style.transform = 'scale(1)';
                              e.target.style.boxShadow = '0 2px 8px rgba(239,68,68,0.4)';
                            }}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Enhanced Instructions */}
                <div style={{
                  marginTop: '1.5rem',
                  padding: '1.5rem',
                  background: canAccessApp 
                    ? 'linear-gradient(135deg, #FEF3C7, #FDE68A)' 
                    : 'linear-gradient(135deg, #FEF2F2, #FECACA)',
                  border: `2px solid ${canAccessApp ? '#F59E0B' : '#EF4444'}`,
                  borderRadius: '16px'
                }}>
                  <h3 style={{
                    fontWeight: '700',
                    color: canAccessApp ? '#92400E' : '#991B1B',
                    marginBottom: '1rem',
                    fontSize: '1.1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    {canAccessApp ? '💡 Pro Tips:' : '🔒 Access Requirements:'}
                  </h3>
                  <ul style={{
                    fontSize: '0.9rem',
                    color: canAccessApp ? '#92400E' : '#7F1D1D',
                    margin: 0,
                    paddingLeft: '1.2rem',
                    lineHeight: '1.6'
                  }}>
                    {canAccessApp ? (
                      <>
                        <li style={{ marginBottom: '0.3rem' }}>🔢 Enter any Bearish token ID</li>
                        <li style={{ marginBottom: '0.3rem' }}>🎨 Click assets to add them</li>
                        <li style={{ marginBottom: '0.3rem' }}>🖱️ Drag assets to reposition</li>
                        <li style={{ marginBottom: '0.3rem' }}>📐 Use corner handles to resize</li>
                        <li style={{ marginBottom: '0.3rem' }}>💾 Download in high quality</li>
                        <li>🎯 Click outside to deselect</li>
                      </>
                    ) : (
                      <>
                        <li style={{ marginBottom: '0.3rem' }}>🔗 Connect your Abstract wallet</li>
                        <li style={{ marginBottom: '0.3rem' }}>💎 Hold at least {MINIMUM_TOKEN_BALANCE} $GUGO token</li>
                        <li style={{ marginBottom: '0.3rem' }}>🔄 Click refresh to check balance</li>
                        <li>✨ Unlock premium customization features</li>
                      </>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}