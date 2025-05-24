// lib/analytics.js
import { firestore } from '$lib/firebase.js';
import { doc, getDoc, setDoc, updateDoc, increment, serverTimestamp, collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';

/**
 * Calculate interest rating based on time spent and clicks
 * Formula: (timeSpent * 0.1) + (clicks * 5) + bonuses
 */
function calculateInterestRating(timeSpent, clicks, pageViews = 1) {
  const timeScore = Math.min(timeSpent * 0.1, 50); // Cap time contribution at 50 points
  const clickScore = clicks * 5;
  const viewBonus = pageViews * 2;
  
  // Bonus for sustained engagement (more than 30 seconds)
  const engagementBonus = timeSpent > 30 ? 10 : 0;
  
  return Math.round(timeScore + clickScore + viewBonus + engagementBonus);
}

/**
 * Track user interaction with a match
 */
export async function trackMatchInteraction(matchId, interactionType, data = {}) {
  if (!matchId) {
    console.warn('No matchId provided for tracking');
    return;
  }

  try {
    const analyticsRef = doc(firestore, 'analytics', matchId);
    const docSnap = await getDoc(analyticsRef);

    const now = new Date();
    const updateData = {
      matchId,
      lastUpdated: serverTimestamp(),
      updatedAt: now.toISOString()
    };

    if (docSnap.exists()) {
      // Update existing document
      const currentData = docSnap.data();
      
      switch (interactionType) {
        case 'click':
          updateData.clicks = increment(1);
          break;
          
        case 'timeSpent':
          const additionalTime = data.timeSpent || 0;
          if (additionalTime > 0) {
            updateData.timeSpent = increment(additionalTime);
          }
          break;
          
        case 'pageView':
          updateData.pageViews = increment(1);
          updateData.lastViewedAt = serverTimestamp();
          break;
          
        case 'share':
          updateData.shares = increment(1);
          break;
      }

      await updateDoc(analyticsRef, updateData);
      
      // Recalculate interest rating
      const updatedDoc = await getDoc(analyticsRef);
      const updatedData = updatedDoc.data();
      const newRating = calculateInterestRating(
        updatedData.timeSpent || 0,
        updatedData.clicks || 0,
        updatedData.pageViews || 0
      );
      
      await updateDoc(analyticsRef, {
        interestRating: newRating
      });

    } else {
      // Create new document
      const initialData = {
        matchId,
        clicks: interactionType === 'click' ? 1 : 0,
        timeSpent: interactionType === 'timeSpent' ? (data.timeSpent || 0) : 0,
        pageViews: interactionType === 'pageView' ? 1 : 0,
        shares: interactionType === 'share' ? 1 : 0,
        createdAt: serverTimestamp(),
        lastUpdated: serverTimestamp(),
        lastViewedAt: interactionType === 'pageView' ? serverTimestamp() : null,
        updatedAt: now.toISOString()
      };

      initialData.interestRating = calculateInterestRating(
        initialData.timeSpent,
        initialData.clicks,
        initialData.pageViews
      );

      await setDoc(analyticsRef, initialData);
    }

    console.log(`Tracked ${interactionType} for match ${matchId}`);
  } catch (error) {
    console.error('Error tracking match interaction:', error);
  }
}

/**
 * Get trending matches based on interest rating
 */
export async function getTrendingMatches(maxResults = 20) {
  try {
    const analyticsCollection = collection(firestore, 'analytics');
    
    // Get matches from the last 7 days to ensure relevance
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const trendingQuery = query(
      analyticsCollection,
      where('lastUpdated', '>=', oneWeekAgo),
      orderBy('interestRating', 'desc'),
      limit(maxResults)
    );

    const querySnapshot = await getDocs(trendingQuery);
    const trendingData = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      trendingData.push({
        matchId: data.matchId,
        interestRating: data.interestRating || 0,
        clicks: data.clicks || 0,
        timeSpent: data.timeSpent || 0,
        pageViews: data.pageViews || 0,
        shares: data.shares || 0,
        lastUpdated: data.lastUpdated
      });
    });

    return trendingData;
  } catch (error) {
    console.error('Error getting trending matches:', error);
    return [];
  }
}

/**
 * Get analytics data for a specific match
 */
export async function getMatchAnalytics(matchId) {
  if (!matchId) return null;

  try {
    const analyticsRef = doc(firestore, 'analytics', matchId);
    const docSnap = await getDoc(analyticsRef);

    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  } catch (error) {
    console.error('Error getting match analytics:', error);
    return null;
  }
}

/**
 * Batch update analytics for multiple matches (useful for cleanup or migration)
 */
export async function batchUpdateAnalytics(updates) {
  try {
    const promises = updates.map(({ matchId, data }) => {
      const analyticsRef = doc(firestore, 'analytics', matchId);
      return updateDoc(analyticsRef, {
        ...data,
        lastUpdated: serverTimestamp()
      });
    });

    await Promise.all(promises);
    console.log(`Batch updated ${updates.length} analytics records`);
  } catch (error) {
    console.error('Error in batch update:', error);
  }
}

/**
 * Clean up old analytics data (older than 30 days)
 */
export async function cleanupOldAnalytics() {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const analyticsCollection = collection(firestore, 'analytics');
    const oldDataQuery = query(
      analyticsCollection,
      where('lastUpdated', '<', thirtyDaysAgo)
    );

    const querySnapshot = await getDocs(oldDataQuery);
    
    if (querySnapshot.empty) {
      console.log('No old analytics data to clean up');
      return 0;
    }

    const deletePromises = [];
    querySnapshot.forEach((doc) => {
      deletePromises.push(deleteDoc(doc.ref));
    });

    await Promise.all(deletePromises);
    console.log(`Cleaned up ${deletePromises.length} old analytics records`);
    return deletePromises.length;
  } catch (error) {
    console.error('Error cleaning up old analytics:', error);
    return 0;
  }
}