# HW1

This is the link to my presentation: https://tommy-dang.github.io/HW1/

This is the link to my github repo: https://github.com/Tommy-Dang/HW1

This is the link to my teaser image: https://github.com/Tommy-Dang/HW1/blob/master/Dang_hw1.gif

![Elevator_Image_Huyen](https://github.com/Tommy-Dang/HW1/blob/master/Dang_hw1.png)


/**
 * Hue. 
 * 
 * Hue is the color reflected from or transmitted through an object 
 * and is typically referred to as the name of the color (red, blue, yellow, etc.) 
 * Move the cursor vertically over each bar to alter its hue. 
 */
 
int barWidth = 20;
int lastBar = -1;

void setup() 
{
  size(640, 360);
  colorMode(HSB, height, height, height);  
  noStroke();
  background(0);
}

void draw() 
{
  int whichBar = mouseX / barWidth;
  if (whichBar != lastBar) {
    int barX = whichBar * barWidth;
    fill(mouseY, height, height);
    rect(barX, 0, barWidth, height);
    lastBar = whichBar;
  }
}
