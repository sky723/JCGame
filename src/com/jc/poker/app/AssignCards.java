package com.jc.poker.app;

import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.MediaType;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import com.jc.poker.businessobjects.Card;
import com.jc.poker.businessobjects.Person;

@Path("/game")
public class AssignCards {
	
	@GET
	@Path("getallcards")
	@Produces({MediaType.APPLICATION_XML, MediaType.APPLICATION_JSON})
	public List<Card> getAllCards() {
		List<Card> cardList = RandomShuffler.getRandomCardList();
		return cardList;
	}
	
	public static void main (String args[]) {
		List<Card> cardList = RandomShuffler.getRandomCardList();
		for(Card card: cardList) {
			System.out.println(card.getSuit() + " : " + card.getDisplayNumber());
		}
		
		Long numberOfpersons = new Long(5);
		
		/**
		Long numberOfpersons = Long.valueOf(args[0]);
		if(numberOfpersons < 2 || numberOfpersons > 10) {
			System.out.println("No more than 10 or less than 2 persons can play.");
			return;
		}
		**/
		List<Person> personList = new ArrayList<Person>();
		int k = 0;
		for(int i = 0; i < numberOfpersons; i ++) {
			Person person = new Person();
			person.setName("Person: " + String.valueOf(i));
			person.setFirstCard(cardList.get(k));
			person.setSecondCard(cardList.get(k+1));
			k = k+2;
			personList.add(person);
			
			System.out.println(person.getName() + " Got " + person.getMyCards());
			
		}
		
		Collections.sort(personList, new CardComparator());
		int j =1;
		for(Person person: personList) {
			System.out.println("Winner : " + j + " is " + person.getName());
			j++;
		}
		
		
	}

}
