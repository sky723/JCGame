package com.jc.games.intf;

import java.util.List;

import com.jc.poker.businessobjects.Card;

public interface IRule {
	
	public boolean isRuleSatisfied(List<Card> cardList) throws Exception;

}
