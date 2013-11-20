package com.jc.poker.businessobjects;

import java.util.List;

import javax.xml.bind.annotation.XmlRootElement;

@XmlRootElement
public class Person {
	private String name;
	private Card firstCard;
	private Card secondCard;
	private List<Card> deckCards;
	
	public String getName() {
		return name;
	}
	public void setName(String name) {
		this.name = name;
	}
	public Card getFirstCard() {
		return firstCard;
	}
	public void setFirstCard(Card firstCard) {
		this.firstCard = firstCard;
	}
	public Card getSecondCard() {
		return secondCard;
	}
	public void setSecondCard(Card secondCard) {
		this.secondCard = secondCard;
	}
	public List<Card> getDeckCards() {
		return deckCards;
	}
	public void setDeckCards(List<Card> deckCards) {
		this.deckCards = deckCards;
	}
	
	
	public String getMyCards() {
		return firstCard.getSuit()+ ":" + firstCard.getDisplayNumber() + " AND " + secondCard.getSuit() + ":" + secondCard.getDisplayNumber();
	}
	
	
	
}
