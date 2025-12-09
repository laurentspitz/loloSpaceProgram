Feature: Historical Progression system

  Scenario: Game Starts in 1957
    Given I am on the Main Menu
    When I click the "New Game" button
    Then I should see the Game Canvas
    And the Game Date Year should be 1957

  Scenario: Basic Parts Available in 1957
    Given I am on the Main Menu
    When I click the "Build Rocket" button
    Then I should see the Hangar UI
    And I should see "Mk1 Command Pod" in the parts list
    And I should not see "Apollo Capsule" in the parts list

  Scenario: Chronology Menu Displays Events
    Given I am on the Main Menu
    When I click the "Chronology" button
    Then I should see the Chronology Timeline
    And I should see "Sputnik 1" in the timeline
    And I should see "Apollo 11" in the timeline
    When I click the "CLOSE" button
    Then I should see the Main Menu container
