function GameManager(){
    var gridCanvas = document.getElementById('grid-canvas');
    var nextCanvas = document.getElementById('next-canvas');
    var nextCanvas2 = document.getElementById('next-canvas2');
    var nextCanvas3 = document.getElementById('next-canvas3');
    var nextCanvas4 = document.getElementById('next-canvas4');
    var nextCanvas5 = document.getElementById('next-canvas5');
    var scoreContainer = document.getElementById("score-container");
    var resetButton = document.getElementById('reset-button');
    var gridContext = gridCanvas.getContext('2d');
    var nextContext = nextCanvas.getContext('2d');
    var nextContext2 = nextCanvas2.getContext('2d');
    var nextContext3 = nextCanvas3.getContext('2d');
    var nextContext4 = nextCanvas4.getContext('2d');
    var nextContext5 = nextCanvas5.getContext('2d');
    var nextContexts = [nextContext, nextContext2, nextContext3, nextContext4, nextContext5];
    document.addEventListener('keydown', onKeyDown);

    var grid = new Grid(22, 10);
    var rpg = new RandomPieceGenerator();
    var tspin = new Tspin();
    var workingPieces = [null, rpg.nextPiece(), rpg.nextPiece(), rpg.nextPiece(), rpg.nextPiece(), rpg.nextPiece()];
    var workingPiece = null;
    var ghostPiece = null;
    var isKeyEnabled = false;
    var gravityTimer = new Timer(onGravityTimerTick, 500);
    var score = 0;
    var isPaused = false;

    // Graphics
    function intToRGBHexString(v){
        return 'rgb(' + ((v >> 16) & 0xFF) + ',' + ((v >> 8) & 0xFF) + ',' + (v & 0xFF) + ')';
    }

    function redrawGridCanvas(workingPieceVerticalOffset = 0){
        gridContext.save();

        // Clear
        gridContext.clearRect(0, 0, gridCanvas.width, gridCanvas.height);

        // Draw grid
        for(var r = 2; r < grid.rows; r++){
            for(var c = 0; c < grid.columns; c++){
                if (grid.cells[r][c] != 0){
                    gridContext.fillStyle= intToRGBHexString(grid.cells[r][c]);
                    gridContext.fillRect(20 * c, 20 * (r - 2), 20, 20);
                    gridContext.strokeStyle="#FFFFFF";
                    gridContext.strokeRect(20 * c, 20 * (r - 2), 20, 20);
                }
            }
        }

        // Draw working piece
        for(var r = 0; r < workingPiece.dimension; r++){
            for(var c = 0; c < workingPiece.dimension; c++){
                if (workingPiece.cells[r][c] != 0){
                    gridContext.fillStyle = intToRGBHexString(workingPiece.cells[r][c]);
                    gridContext.fillRect(20 * (c + workingPiece.column), 20 * ((r + workingPiece.row) - 2) + workingPieceVerticalOffset, 20, 20);
                    gridContext.strokeStyle="#FFFFFF";
                    gridContext.strokeRect(20 * (c + workingPiece.column), 20 * ((r + workingPiece.row) - 2) + workingPieceVerticalOffset, 20, 20);
                }
            }
        }

        // TODO: Draw ghost piece

        gridContext.restore();
    }

    function redrawNextCanvas(){
      for (var i = 0; i < nextContexts.length; i++) {
        if (i == 0) { // Next Piece
          nextContexts[i].save();
          nextContexts[i].clearRect(0, 0, nextCanvas.width, nextCanvas.height);
          var next = workingPieces[1];
          var xOffset = next.dimension == 2 ? 20 : next.dimension == 3 ? 10 : next.dimension == 4 ? 0 : null;
          var yOffset = next.dimension == 2 ? 20 : next.dimension == 3 ? 20 : next.dimension == 4 ? 10 : null;
          for(var r = 0; r < next.dimension; r++){
              for(var c = 0; c < next.dimension; c++){
                  if (next.cells[r][c] != 0){
                      nextContext.fillStyle = intToRGBHexString(next.cells[r][c]);
                      nextContext.fillRect(xOffset + 20 * c, yOffset + 20 * r, 20, 20);
                      nextContext.strokeStyle = "#FFFFFF";
                      nextContext.strokeRect(xOffset + 20 * c, yOffset + 20 * r, 20, 20);
                  }
              }
          }
          nextContexts[i].restore();
        }
        else { // More next pieces
          nextContexts[i].save();
          nextContexts[i].clearRect(0, 0, nextCanvas2.width, nextCanvas2.height);
          var next = workingPieces[i+1];
          var xOffset = next.dimension == 2 ? 10 : next.dimension == 3 ? 5 : next.dimension == 4 ? 0 : null;
          var yOffset = next.dimension == 2 ? 10 : next.dimension == 3 ? 5 : next.dimension == 4 ? 5 : null;
          for(var r = 0; r < next.dimension; r++){
              for(var c = 0; c < next.dimension; c++){
                  if (next.cells[r][c] != 0){
                      nextContexts[i].fillStyle = intToRGBHexString(next.cells[r][c]);
                      nextContexts[i].fillRect(xOffset + 10 * c, yOffset + 10 * r, 10, 10);
                      nextContexts[i].strokeStyle = "#FFFFFF";
                      nextContexts[i].strokeRect(xOffset + 10 * c, yOffset + 10 * r, 10, 10);
                  }
              }
          }
          nextContexts[i].restore();
        }
      }
    }

    function updateScoreContainer(){
        scoreContainer.innerHTML = score.toString();
    }

    // Drop animation
    var workingPieceDropAnimationStopwatch = null;

    function startWorkingPieceDropAnimation(callback = function(){}){
        // Calculate animation height
        animationHeight = 0;
        _workingPiece = workingPiece.clone();
        while(_workingPiece.moveDown(grid)){
            animationHeight++;
        }

        var stopwatch = new Stopwatch(function(elapsed){
            if(elapsed >= animationHeight * 20){
                stopwatch.stop();
                redrawGridCanvas(20 * animationHeight);
                callback();
                return;
            }

            redrawGridCanvas(20 * elapsed / 20);
        });

        workingPieceDropAnimationStopwatch = stopwatch;
    }

    function cancelWorkingPieceDropAnimation(){
        if(workingPieceDropAnimationStopwatch === null){
            return;
        }
        workingPieceDropAnimationStopwatch.stop();
        workingPieceDropAnimationStopwatch = null;
    }

    // Process start of turn
    function startTurn(){
        // Shift working pieces
        for(var i = 0; i < workingPieces.length - 1; i++){
            workingPieces[i] = workingPieces[i + 1];
        }
        workingPieces[workingPieces.length - 1] = rpg.nextPiece();
        workingPiece = workingPieces[0];

        // Refresh Graphics
        redrawGridCanvas();
        redrawNextCanvas();

        isKeyEnabled = true;
        gravityTimer.resetForward(500);
    }

    // Process end of turn
    function endTurn(){
        // Add working piece
        grid.addPiece(workingPiece);

        // Clear lines
        score += grid.clearLines();

        // Check for tspin opportunity
        if (tspin.goodOpportunity(grid)) {
          console.log("opportunity found");
          ghostPiece = tspin.ghostPiece();
        }

        // Refresh graphics
        redrawGridCanvas();
        updateScoreContainer();

        return !grid.exceeded();
    }

    // Process gravity tick
    function onGravityTimerTick(){
        // If working piece has not reached bottom
        if(workingPiece.canMoveDown(grid)){
            workingPiece.moveDown(grid);
            redrawGridCanvas();
            return;
        }

        // Stop gravity if working piece has reached bottom
        gravityTimer.stop();

        // If working piece has reached bottom, end of turn has been processed
        // and game cannot continue because grid has been exceeded
        if(!endTurn()){
            isKeyEnabled = false;
            alert('Game Over!');
            return;
        }

        // If working piece has reached bottom, end of turn has been processed
        // and game can still continue.
        startTurn();
    }

    // Process keys
    function onKeyDown(event){
        if(!isKeyEnabled){
            return;
        }
        switch(event.which){
            case 80: // p
              if (!this.isPaused) {
                gravityTimer.pause();
                this.isPaused = true;
                console.log("paused");
              } else {
                gravityTimer.unPause();
                this.isPaused = false;
                console.log("unpaused");
              }
              break;
            case 32: // spacebar
                isKeyEnabled = false;
                gravityTimer.stop(); // Stop gravity
                startWorkingPieceDropAnimation(function(){ // Start drop animation
                    while(workingPiece.moveDown(grid)); // Drop working piece
                    if(!endTurn()){
                        alert('Game Over!');
                        return;
                    }
                    startTurn();
                });
                break;
            case 40: // down
                gravityTimer.resetForward(500);
                break;
            case 37: //left
                if(workingPiece.canMoveLeft(grid)){
                    workingPiece.moveLeft(grid);
                    redrawGridCanvas();
                }
                break;
            case 39: //right
                if(workingPiece.canMoveRight(grid)){
                    workingPiece.moveRight(grid);
                    redrawGridCanvas();
                }
                break;
            case 38: //up
                workingPiece.rotate(grid);
                redrawGridCanvas();
                break;
        }
    }

    resetButton.onclick = function(){
        gravityTimer.stop();
        cancelWorkingPieceDropAnimation();
        grid = new Grid(22, 10);
        rpg = new RandomPieceGenerator();
        workingPieces = [null, rpg.nextPiece(), rpg.nextPiece(), rpg.nextPiece(), rpg.nextPiece(), rpg.nextPiece()];
        workingPiece = null;
        score = 0;
        isKeyEnabled = true;
        updateScoreContainer();
        startTurn();
    }

    startTurn();
}
