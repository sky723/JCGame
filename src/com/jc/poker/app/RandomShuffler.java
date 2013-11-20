package com.jc.poker.app;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import com.jc.poker.businessobjects.Card;

public class RandomShuffler {
	
	public static List<Card> getRandomCardList() {
		List<Card> cardList = new ArrayList<Card>();
	    int[] deck = new int[52];
	    String[] suits = {"Spades", "Hearts", "Diamonds", "Clubs"};
	    Long[] ranks = {new Long(14), new Long(2), new Long(3), new Long(4), new Long(5),new Long(6),new Long(7),new Long(8),new Long(9),new Long(10),new Long(11),new Long(12), new Long(13)};

	    // Initialize cards
	    for (int i = 0; i < deck.length; i++) {
	      deck[i] = i;
	    }

	   	    // Display the all the cards
	    for (int i = 0; i < 52; i++) {
	      Card card = new Card();
	      card.setSuit(suits[deck[i] / 13]);
	      card.setNumber(ranks[deck[i] % 13]);
	      cardList.add(card);
	    }
	    Collections.shuffle(cardList);
	
	    return cardList;
	}
}
