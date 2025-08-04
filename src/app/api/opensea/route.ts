// src/app/api/opensea/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenId = searchParams.get('tokenId');

  // Debug logging
  console.log('=== API DEBUG ===');
  console.log('Token ID:', tokenId);
  console.log('Has API Key:', !!process.env.OPENSEA_API_KEY);
  console.log('API Key length:', process.env.OPENSEA_API_KEY?.length || 0);
  
  if (!tokenId) {
    return NextResponse.json({ error: "Missing token ID" }, { status: 400 });
  }

  // If no API key in production, return error message
  if (!process.env.OPENSEA_API_KEY) {
    return NextResponse.json({ 
      error: "OpenSea API key not configured in Netlify environment variables" 
    }, { status: 500 });
  }

  try {
    // BEARISH collection contract address on Abstract chain
    const BEARISH_CONTRACT_ADDRESS = "0x516dc288e26b34557f68ea1c1ff13576eff8a168";
    
    // Correct OpenSea API v2 endpoint format
    const url = `https://api.opensea.io/api/v2/chain/abstract/contract/${BEARISH_CONTRACT_ADDRESS}/nfts/${tokenId}`;
    
    console.log('Fetching from OpenSea:', url);
    
    const response = await fetch(url, {
      headers: {
        'X-API-KEY': process.env.OPENSEA_API_KEY!,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ error: "NFT not found" }, { status: 404 });
      }
      throw new Error(`OpenSea API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('OpenSea response:', data);
    
    // Extract image URL from the response
    const nft = data.nft;
    const imageUrl = nft?.image_url || nft?.display_image_url || nft?.image;
    
    if (!imageUrl) {
      return NextResponse.json({ error: "No image found for this NFT" }, { status: 404 });
    }

    return NextResponse.json({
      image_url: imageUrl,
      name: nft?.name || `Bearish #${tokenId}`,
      description: nft?.description || '',
      collection: nft?.collection || 'BEARISH',
      token_id: tokenId,
      traits: nft?.traits || [],
      contract_address: BEARISH_CONTRACT_ADDRESS,
      opensea_url: `https://opensea.io/assets/abstract/${BEARISH_CONTRACT_ADDRESS}/${tokenId}`
    });

  } catch (error: any) {
    console.error('OpenSea API Error:', error);
    return NextResponse.json({ 
      error: "Failed to fetch NFT data",
      details: error.message 
    }, { status: 500 });
  }
}

// Alternative function to find the contract address
export async function POST(request: NextRequest) {
  try {
    // This endpoint helps you search for the BEARISH collection to get the contract address
    const { searchParams } = new URL(request.url);
    const collectionSlug = searchParams.get('collection') || 'bearish-abstract';
    
    const url = `https://api.opensea.io/api/v2/collections/${collectionSlug}`;
    
    const response = await fetch(url, {
      headers: {
        'X-API-KEY': process.env.OPENSEA_API_KEY!,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch collection: ${response.status}`);
    }

    const data = await response.json();
    
    return NextResponse.json({
      collection: data,
      contracts: data.contracts || [],
    });

  } catch (error: any) {
    console.error('Collection lookup error:', error);
    return NextResponse.json({ 
      error: "Failed to fetch collection data",
      details: error.message 
    }, { status: 500 });
  }
}