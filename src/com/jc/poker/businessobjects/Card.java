package com.jc.poker.businessobjects;

import javax.xml.bind.annotation.XmlRootElement;

@XmlRootElement
public class Card {
	
	private String suit;
	private Long number;
	private String displayNumber;
	
	public void setDisplayNumber() {
		if(number == 11) {
			this.displayNumber =  "Jack";
		} else if (number==12) {
			this.displayNumber = "Queen";
		} else if(number==13) {
			this.displayNumber = "King";
		}else if(number==14) {
			this.displayNumber = "Ace";
		}else {
			this.displayNumber = String.valueOf(number);
		}
	}
	public String getSuit() {
		return suit;
	}
	public void setSuit(String suit) {
		this.suit = suit;
	}
	public Long getNumber() {
		return number;
	}
	public void setNumber(Long number) {
		this.number = number;
		setDisplayNumber();
	}
	
	public String getDisplayNumber() {
		return displayNumber;
	}

}
