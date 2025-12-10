Feature: Hangar Assembly

  Scenario: Build and Launch Rocket
    Given I am on the Hub Screen
    When I click "Build Rocket (Hangar)"
    Then I should see the Hangar UI
    
    When I add a "Command Pod Mk1" to the assembly
    And I add a "Fuel Tank X200-32" to the assembly
    And I add a "LV-T30 \"Reliant\"" to the assembly
    Then the rocket mass should be greater than 0
    
    When I click the "LAUNCH" button
    Then I should see the Game Canvas

  Scenario: Save and Load Rocket
    Given I am in the Hangar
    And I add a "Command Pod Mk1" to the assembly
    
    When I click the "SAVE" button
    And I enter "Test Rocket" into the active input
    And I click "Save" in the dialog
    Then I should see a success notification "Rocket \"Test Rocket\" saved"
    
    When I click the "NEW" button
    And I click "Confirm" in the dialog
    Then the rocket mass should be 0
    
    When I click the "LOAD" button
    And I select "Test Rocket" from the list
    Then the rocket mass should be greater than 0
    
    When I click the "LOAD" button
    And I delete "Test Rocket" from the list
    Then "Test Rocket" should not be in the load list
